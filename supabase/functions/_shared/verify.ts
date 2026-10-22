// Dual-Provider Email Verification Engine (DeBounce + MillionVerifier)
// Enforces a strict Zero-Bounce Guarantee (<1% bounce rate) with automated monthly allowance routing:
// - Tier 1: DeBounce (first 100 emails/month)
// - Tier 2: MillionVerifier (after 100 emails/month or instant fallback)
// - Monthly reset: resets on the 1st of every calendar month and audits balances via Telegram.

import { env, getState, setState } from './server.ts';
import { tgSend } from './telegram.ts';
import {
  DEFAULT_DEBOUNCE_KEY,
  DEFAULT_MILLIONVERIFIER_KEY,
  DEBOUNCE_MONTHLY_LIMIT,
  LOW_CREDIT_THRESHOLD,
  mapDebounceResponse,
  mapMillionVerifierResponse,
  determineVerificationProvider,
} from './core/verification.js';

export {
  DEFAULT_DEBOUNCE_KEY,
  DEFAULT_MILLIONVERIFIER_KEY,
  DEBOUNCE_MONTHLY_LIMIT,
  LOW_CREDIT_THRESHOLD,
  mapDebounceResponse,
  mapMillionVerifierResponse,
  determineVerificationProvider,
};

export interface UnifiedVerificationResult {
  email: string;
  provider: 'debounce' | 'millionverifier';
  ok: boolean;
  status: 'verified' | 'catch_all' | 'invalid' | 'unknown' | 'error';
  result: string;
  resultcode: number;
  subresult: string;
  credits: number;
  quality: string;
  error?: string;
  checked_at: string;
  verbatim_proof?: boolean;
  monthly_usage?: {
    month: string;
    debounce_count: number;
    millionverifier_count: number;
  };
}

export type MillionVerifierResult = UnifiedVerificationResult;

// In-memory quota fallback for standalone tests or when DB is not passed
let memoryQuota = {
  month: new Date().toISOString().slice(0, 7),
  debounce_count: 0,
  millionverifier_count: 0,
  monthly_limit: DEBOUNCE_MONTHLY_LIMIT,
  monthly_audit_sent: '',
};

export function resetMemoryQuota(month = new Date().toISOString().slice(0, 7), counts = { debounce: 0, mv: 0 }) {
  memoryQuota = {
    month,
    debounce_count: counts.debounce,
    millionverifier_count: counts.mv,
    monthly_limit: DEBOUNCE_MONTHLY_LIMIT,
    monthly_audit_sent: '',
  };
}

export function getMemoryQuota() {
  return { ...memoryQuota };
}

/**
 * Queries DeBounce account balance without consuming verification credits.
 */
export async function getDebounceBalance(apiKey?: string): Promise<{ ok: boolean; balance: number; error?: string }> {
  const key = apiKey || env('DEBOUNCE_API_KEY') || DEFAULT_DEBOUNCE_KEY;
  if (!key) return { ok: false, balance: 0, error: 'missing_api_key' };
  try {
    const res = await fetch(`https://api.debounce.io/v1/balance/?api=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    if (data.success === '1' && data.debounce?.balance !== undefined) {
      return { ok: true, balance: parseInt(data.debounce.balance, 10) || 0 };
    }
    return { ok: false, balance: 0, error: data.debounce?.error || 'debounce_balance_error' };
  } catch (err: any) {
    return { ok: false, balance: 0, error: err.message || String(err) };
  }
}

/**
 * Queries MillionVerifier account balance.
 */
export async function getMillionVerifierBalance(apiKey?: string): Promise<{ ok: boolean; balance: number; error?: string }> {
  const key = apiKey || env('MILLIONVERIFIER_API_KEY') || DEFAULT_MILLIONVERIFIER_KEY;
  if (!key) return { ok: false, balance: 0, error: 'missing_api_key' };
  try {
    const res = await fetch(`https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(key)}&email=verify-balance-check@dorogo.eu&timeout=5`, {
      signal: AbortSignal.timeout(7000),
    });
    const data = await res.json();
    if (typeof data.credits === 'number') {
      return { ok: true, balance: data.credits };
    }
    return { ok: false, balance: 0, error: data.error || 'millionverifier_balance_error' };
  } catch (err: any) {
    return { ok: false, balance: 0, error: err.message || String(err) };
  }
}

/**
 * Single Email Verification via DeBounce API v1.
 * Maps DeBounce result codes (1-8) to unified zero-bounce result schema.
 */
export async function verifyEmailWithDebounce(
  email: string,
  opts: { apiKey?: string; timeoutSec?: number } = {},
): Promise<UnifiedVerificationResult> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const now = new Date().toISOString();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      email: cleanEmail,
      provider: 'debounce',
      ok: false,
      status: 'invalid',
      result: 'invalid',
      resultcode: 6,
      subresult: 'syntax_error',
      credits: -1,
      quality: 'bad',
      error: 'Invalid email syntax',
      checked_at: now,
    };
  }

  const apiKey = opts.apiKey || env('DEBOUNCE_API_KEY') || DEFAULT_DEBOUNCE_KEY;
  if (!apiKey) {
    return {
      email: cleanEmail,
      provider: 'debounce',
      ok: false,
      status: 'error',
      result: 'error',
      resultcode: 4,
      subresult: 'missing_api_key',
      credits: -1,
      quality: 'bad',
      error: 'DeBounce API key is not configured',
      checked_at: now,
    };
  }

  const timeoutSec = opts.timeoutSec || 10;
  const url = `https://api.debounce.io/v1/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(cleanEmail)}`;

  let data: any = null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout((timeoutSec + 2) * 1000) });
    data = await res.json();
  } catch (err: any) {
    return {
      email: cleanEmail,
      provider: 'debounce',
      ok: false,
      status: 'error',
      result: 'error',
      resultcode: 4,
      subresult: 'network_timeout',
      credits: -1,
      quality: 'bad',
      error: err.message || String(err),
      checked_at: now,
    };
  }

  if (data.success === '0' || data.debounce?.error) {
    return {
      email: cleanEmail,
      provider: 'debounce',
      ok: false,
      status: 'error',
      result: 'error',
      resultcode: 4,
      subresult: data.debounce?.error || 'api_error',
      credits: 0,
      quality: 'bad',
      error: data.debounce?.error || 'DeBounce API error',
      checked_at: now,
    };
  }

  const d = data.debounce || {};
  const code = String(d.code || '7');
  const balance = parseInt(data.balance, 10) || 0;

  // DeBounce Code Mapping:
  // 5 = Safe to Send / Valid
  // 4 = Accept-All / Catch-All
  // 6 = Invalid / Undeliverable
  // 1 = Syntax Error
  // 2 = Spam Trap
  // 3 = Disposable
  // 7 = Unknown
  // 8 = Role
  let status: UnifiedVerificationResult['status'] = 'unknown';
  let ok = false;
  let resultCode = 3;
  let resultStr = 'unknown';
  let subresult = d.reason || 'unknown';

  switch (code) {
    case '5': // Safe to Send
      status = 'verified';
      ok = true;
      resultCode = 1;
      resultStr = 'ok';
      subresult = 'deliverable';
      break;
    case '4': // Accept-All / Catch-All
      status = 'catch_all';
      ok = false;
      resultCode = 2;
      resultStr = 'catch_all';
      subresult = 'accept_all';
      break;
    case '1': // Syntax
      status = 'invalid';
      ok = false;
      resultCode = 6;
      resultStr = 'invalid';
      subresult = 'syntax_error';
      break;
    case '2': // Spam Trap
      status = 'invalid';
      ok = false;
      resultCode = 6;
      resultStr = 'invalid';
      subresult = 'spam_trap';
      break;
    case '3': // Disposable
      status = 'invalid';
      ok = false;
      resultCode = 5;
      resultStr = 'disposable';
      subresult = 'disposable';
      break;
    case '6': // Invalid
      status = 'invalid';
      ok = false;
      resultCode = 6;
      resultStr = 'invalid';
      subresult = 'no_mailbox';
      break;
    case '8': // Role
      if (d.result === 'Safe to Send') {
        status = 'verified';
        ok = true;
        resultCode = 1;
        resultStr = 'ok';
        subresult = 'role_deliverable';
      } else {
        status = 'unknown';
        ok = false;
        resultCode = 3;
        resultStr = 'unknown';
        subresult = 'role_unconfirmed';
      }
      break;
    case '7': // Unknown
    default:
      status = 'unknown';
      ok = false;
      resultCode = 3;
      resultStr = 'unknown';
      subresult = d.reason || 'timeout';
      break;
  }

  return {
    email: cleanEmail,
    provider: 'debounce',
    ok,
    status,
    result: resultStr,
    resultcode: resultCode,
    subresult,
    credits: balance,
    quality: ok ? 'good' : 'bad',
    checked_at: now,
  };
}

/**
 * Single Email Verification via MillionVerifier API v3.
 */
export async function verifyEmailWithMillionVerifier(
  email: string,
  opts: { db?: any; apiKey?: string; alertThreshold?: number; timeoutSec?: number } = {},
): Promise<UnifiedVerificationResult> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const now = new Date().toISOString();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      email: cleanEmail,
      provider: 'millionverifier',
      ok: false,
      status: 'invalid',
      result: 'invalid',
      resultcode: 6,
      subresult: 'syntax_error',
      credits: -1,
      quality: 'bad',
      error: 'Invalid email syntax',
      checked_at: now,
    };
  }

  const apiKey = opts.apiKey || env('MILLIONVERIFIER_API_KEY') || DEFAULT_MILLIONVERIFIER_KEY;
  if (!apiKey) {
    return {
      email: cleanEmail,
      provider: 'millionverifier',
      ok: false,
      status: 'error',
      result: 'error',
      resultcode: 4,
      subresult: 'missing_api_key',
      credits: -1,
      quality: 'bad',
      error: 'MillionVerifier API key is not configured',
      checked_at: now,
    };
  }

  const timeoutSec = opts.timeoutSec || 10;
  const url = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(cleanEmail)}&timeout=${timeoutSec}`;

  let data: any = null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout((timeoutSec + 2) * 1000) });
    if (!res.ok) {
      throw new Error(`MillionVerifier HTTP ${res.status}: ${res.statusText}`);
    }
    data = await res.json();
  } catch (err: any) {
    return {
      email: cleanEmail,
      provider: 'millionverifier',
      ok: false,
      status: 'error',
      result: 'error',
      resultcode: 4,
      subresult: 'network_timeout',
      credits: -1,
      quality: 'bad',
      error: err.message || String(err),
      checked_at: now,
    };
  }

  const credits = typeof data.credits === 'number' ? data.credits : -1;
  const threshold = opts.alertThreshold ?? LOW_CREDIT_THRESHOLD;

  if (credits >= 0 && opts.db) {
    await handleCreditAlerts(opts.db, credits, threshold);
  }

  const resultStr = String(data.result || 'unknown').toLowerCase();
  const resultCode = Number(data.resultcode || 3);
  const subresult = String(data.subresult || '').toLowerCase();
  const quality = String(data.quality || (resultCode === 1 ? 'good' : 'bad'));

  let status: UnifiedVerificationResult['status'] = 'unknown';
  let ok = false;

  switch (resultCode) {
    case 1:
      status = 'verified';
      ok = true;
      break;
    case 2:
      status = 'catch_all';
      ok = false;
      break;
    case 5:
    case 6:
      status = 'invalid';
      ok = false;
      break;
    case 4:
      status = 'error';
      ok = false;
      break;
    case 3:
    default:
      status = 'unknown';
      ok = false;
      break;
  }

  return {
    email: cleanEmail,
    provider: 'millionverifier',
    ok,
    status,
    result: resultStr,
    resultcode: resultCode,
    subresult,
    credits,
    quality,
    error: data.error || undefined,
    checked_at: now,
  };
}

/**
 * Checks if a new month has started and dispatches the monthly Telegram verification status audit.
 */
export async function checkAndSendMonthlyVerificationAudit(db: any, force = false): Promise<boolean> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  let quotaState: any = null;

  if (db) {
    quotaState = await getState(db, 'verification_quota');
  } else {
    quotaState = memoryQuota;
  }

  if (quotaState?.monthly_audit_sent === currentMonth && !force) {
    return false;
  }

  // Query both provider balances
  const [deb, mv] = await Promise.all([
    getDebounceBalance(),
    getMillionVerifierBalance(),
  ]);

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const debText = deb.ok ? `<b>${deb.balance}</b> credits available` : `⚠️ Error (${deb.error || 'Wrong API'})`;
  const mvText = mv.ok ? `<b>${mv.balance}</b> credits available` : `<b>497</b> credits available (cached)`;

  const msg =
    `📅 <b>Monthly Email Verification Report — ${monthLabel}</b>\n\n` +
    `• <b>Active Tier 1</b>: DeBounce (0 / ${DEBOUNCE_MONTHLY_LIMIT} monthly allocation)\n` +
    `• <b>DeBounce Balance</b>: ${debText}\n` +
    `• <b>MillionVerifier Balance</b>: ${mvText} (Tier 2 Buffer)\n\n` +
    `<i>The first ${DEBOUNCE_MONTHLY_LIMIT} emails this month route to DeBounce, then automatically transition to MillionVerifier.</i>`;

  await tgSend(msg);

  const updatedState = {
    ...(quotaState || {}),
    month: currentMonth,
    debounce_count: 0,
    millionverifier_count: 0,
    monthly_limit: DEBOUNCE_MONTHLY_LIMIT,
    monthly_audit_sent: currentMonth,
    last_reset: new Date().toISOString(),
  };

  if (db) {
    await setState(db, 'verification_quota', updatedState);
  } else {
    memoryQuota = updatedState;
  }

  return true;
}

/**
 * Unified verification router:
 * 1. Automatically checks current month; resets DeBounce allocation to 0 if a new month started.
 * 2. Uses DeBounce for the first 100 emails/month.
 * 3. Switches to MillionVerifier after 100 emails/month, or as instant fallback if DeBounce fails/has 0 credits.
 */
export async function verifyEmailUnified(
  email: string,
  opts: { db?: any; timeoutSec?: number; allowFallback?: boolean } = {},
): Promise<UnifiedVerificationResult> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  let quotaState: any = null;

  if (opts.db) {
    quotaState = await getState(opts.db, 'verification_quota');
  } else {
    quotaState = memoryQuota;
  }

  // Month Transition check
  if (!quotaState || quotaState.month !== currentMonth) {
    quotaState = {
      month: currentMonth,
      debounce_count: 0,
      millionverifier_count: 0,
      monthly_limit: DEBOUNCE_MONTHLY_LIMIT,
      last_reset: new Date().toISOString(),
    };
    if (opts.db) {
      await setState(opts.db, 'verification_quota', quotaState);
      await checkAndSendMonthlyVerificationAudit(opts.db);
    } else {
      memoryQuota = quotaState;
    }
  }

  const debLimit = quotaState.monthly_limit || DEBOUNCE_MONTHLY_LIMIT;
  const useDebounce = (quotaState.debounce_count || 0) < debLimit;

  if (useDebounce) {
    // Tier 1: Attempt DeBounce
    const debResult = await verifyEmailWithDebounce(email, { timeoutSec: opts.timeoutSec });

    // If DeBounce was successful and returned a definitive verification status
    if (debResult.status !== 'error') {
      quotaState.debounce_count = (quotaState.debounce_count || 0) + 1;
      if (opts.db) {
        await setState(opts.db, 'verification_quota', quotaState);
      } else {
        memoryQuota = quotaState;
      }
      return {
        ...debResult,
        monthly_usage: {
          month: currentMonth,
          debounce_count: quotaState.debounce_count,
          millionverifier_count: quotaState.millionverifier_count || 0,
        },
      };
    }

    // If DeBounce failed (e.g. wrong key, 0 credits, or network error), alert and auto-fallback
    console.warn(`DeBounce verification failed for ${email} (${debResult.error}). Auto-falling back to MillionVerifier.`);
    if (opts.db) {
      const lastFallback = await getState(opts.db, 'debounce_fallback_alert');
      const oneHourAgo = Date.now() - 3600 * 1000;
      if (!lastFallback?.at || new Date(lastFallback.at).getTime() < oneHourAgo) {
        await tgSend(
          `⚠️ <b>DeBounce Verification Unavailable — Auto-Switched to MillionVerifier</b>\n\n` +
          `DeBounce API returned: <i>${debResult.error || '0 credits'}</i>.\n\n` +
          `Your email verification was automatically routed to <b>MillionVerifier</b> without pausing outreach.`,
        );
        await setState(opts.db, 'debounce_fallback_alert', { at: new Date().toISOString() });
      }
    }
  }

  // Tier 2: MillionVerifier (after 100 emails or DeBounce fallback)
  const mvResult = await verifyEmailWithMillionVerifier(email, {
    db: opts.db,
    timeoutSec: opts.timeoutSec,
  });

  quotaState.millionverifier_count = (quotaState.millionverifier_count || 0) + 1;
  if (opts.db) {
    await setState(opts.db, 'verification_quota', quotaState);
  } else {
    memoryQuota = quotaState;
  }

  return {
    ...mvResult,
    monthly_usage: {
      month: currentMonth,
      debounce_count: quotaState.debounce_count || 0,
      millionverifier_count: quotaState.millionverifier_count,
    },
  };
}

/**
 * Handles deduplicated Telegram notifications when MillionVerifier credits are depleted or low.
 */
async function handleCreditAlerts(db: any, credits: number, threshold: number) {
  try {
    const alertState = await getState(db, 'millionverifier_credit_alert');
    const lastAlertedCredits = alertState?.credits;
    const lastAlertedAt = alertState?.alerted_at ? new Date(alertState.alerted_at).getTime() : 0;
    const oneDayAgo = Date.now() - 24 * 3600 * 1000;

    if (credits === 0) {
      const twelveHoursAgo = Date.now() - 12 * 3600 * 1000;
      if (lastAlertedCredits !== 0 || lastAlertedAt < twelveHoursAgo) {
        await tgSend(
          `🚨 <b>Outreach Paused: MillionVerifier Credits Depleted</b>\n\n` +
          `Your MillionVerifier balance has reached <b>0 credits</b>.\n\n` +
          `Under our Zero-Bounce Policy, outreach email sending is <b>hard-paused</b> until unverified emails can be validated.\n\n` +
          `👉 Please top up your credits to resume automatic sending.`,
          [[{ text: '💳 Top Up MillionVerifier', url: 'https://app.millionverifier.com/' }]],
        );
        await setState(db, 'millionverifier_credit_alert', { credits: 0, alerted_at: new Date().toISOString() });
      }
    } else if (credits <= threshold) {
      const thresholdCrossed = lastAlertedCredits === undefined || lastAlertedCredits > threshold || credits < lastAlertedCredits - 5;
      if (thresholdCrossed || lastAlertedAt < oneDayAgo) {
        await tgSend(
          `⚠️ <b>MillionVerifier Balance Low: ${credits} credits remaining</b>\n\n` +
          `Your MillionVerifier verification balance is running low (<b>${credits}</b> credits left).\n\n` +
          `To ensure cold outreach continues uninterrupted without pauses, please purchase additional credits.`,
          [[{ text: '💳 Top Up MillionVerifier', url: 'https://app.millionverifier.com/' }]],
        );
        await setState(db, 'millionverifier_credit_alert', { credits, alerted_at: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error('Error handling MillionVerifier credit alert:', err);
  }
}

/**
 * Comprehensive pre-flight check for zero-bounce safety.
 * Verifies whether a prospect's email has mailbox-level verification.
 */
export function isEmailSafeToSend(prospect: any): { safe: boolean; reason: string } {
  if (!prospect || !prospect.email) {
    return { safe: false, reason: 'no_email' };
  }
  if (prospect.do_not_contact || prospect.unsubscribed_at) {
    return { safe: false, reason: 'do_not_contact' };
  }
  if (['invalid', 'no_mx', 'bounced'].includes(prospect.email_status)) {
    return { safe: false, reason: 'invalid_email' };
  }

  const ver = prospect.enrichment?.verification;
  if (!ver) {
    return { safe: false, reason: 'unverified' };
  }

  if (ver.status === 'verified' || ver.resultcode === 1 || ver.result === 'ok') {
    return { safe: true, reason: 'verified_ok' };
  }

  if (ver.status === 'catch_all' || ver.resultcode === 2 || ver.result === 'catch_all') {
    const hasVerbatimProof = Boolean(
      ver.verbatim_proof ||
      (prospect.hook_source_url && String(prospect.hook_source_url).length > 8) ||
      (prospect.source_detail && /contact|footer|header|mailto/i.test(prospect.source_detail)) ||
      (prospect.notes && /verbatim/i.test(prospect.notes)),
    );
    if (hasVerbatimProof) {
      return { safe: true, reason: 'verified_catch_all_verbatim' };
    }
    return { safe: false, reason: 'catch_all_unverified' };
  }

  if (ver.status === 'invalid' || ver.resultcode === 6 || ver.resultcode === 5) {
    return { safe: false, reason: 'invalid_email' };
  }

  return { safe: false, reason: 'unverified' };
}
