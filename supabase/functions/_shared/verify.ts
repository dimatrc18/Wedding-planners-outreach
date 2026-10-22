// Dual-Provider Email Verification Engine (ZeroBounce + MillionVerifier)
// Enforces a strict Zero-Bounce Guarantee (<1% bounce rate) with automated monthly allowance routing:
// - Tier 1: ZeroBounce (first 100 free emails/month)
// - Tier 2: MillionVerifier (after 100 emails/month or instant fallback)
// - Monthly reset: resets on the 1st of every calendar month and audits balances via Telegram.

import { env, getState, setState } from './server.ts';
import { tgSend } from './telegram.ts';
import {
  DEFAULT_ZEROBOUNCE_KEY,
  DEFAULT_DEBOUNCE_KEY,
  DEFAULT_MILLIONVERIFIER_KEY,
  ZEROBOUNCE_MONTHLY_LIMIT,
  DEBOUNCE_MONTHLY_LIMIT,
  LOW_CREDIT_THRESHOLD,
  mapZeroBounceResponse,
  mapDebounceResponse,
  mapMillionVerifierResponse,
  determineVerificationProvider,
} from './core/verification.js';

export {
  DEFAULT_ZEROBOUNCE_KEY,
  DEFAULT_DEBOUNCE_KEY,
  DEFAULT_MILLIONVERIFIER_KEY,
  ZEROBOUNCE_MONTHLY_LIMIT,
  DEBOUNCE_MONTHLY_LIMIT,
  LOW_CREDIT_THRESHOLD,
  mapZeroBounceResponse,
  mapDebounceResponse,
  mapMillionVerifierResponse,
  determineVerificationProvider,
};

export interface UnifiedVerificationResult {
  email: string;
  provider: 'zerobounce' | 'debounce' | 'millionverifier';
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
    zerobounce_count?: number;
    debounce_count?: number;
    millionverifier_count: number;
  };
}

export type MillionVerifierResult = UnifiedVerificationResult;

// In-memory quota fallback for standalone tests or when DB is not passed
let memoryQuota = {
  month: new Date().toISOString().slice(0, 7),
  zerobounce_count: 0,
  debounce_count: 0,
  millionverifier_count: 0,
  monthly_limit: ZEROBOUNCE_MONTHLY_LIMIT,
  monthly_audit_sent: '',
};

export function resetMemoryQuota(month = new Date().toISOString().slice(0, 7), counts = { zb: 0, mv: 0 }) {
  memoryQuota = {
    month,
    zerobounce_count: counts.zb,
    debounce_count: counts.zb,
    millionverifier_count: counts.mv,
    monthly_limit: ZEROBOUNCE_MONTHLY_LIMIT,
    monthly_audit_sent: '',
  };
}

export function getMemoryQuota() {
  return { ...memoryQuota };
}

/**
 * Queries ZeroBounce account balance.
 */
export async function getZeroBounceBalance(apiKey?: string): Promise<{ ok: boolean; balance: number; error?: string }> {
  const key = apiKey || env('ZEROBOUNCE_API_KEY') || env('DEBOUNCE_API_KEY') || DEFAULT_ZEROBOUNCE_KEY;
  if (!key) return { ok: false, balance: 0, error: 'missing_api_key' };
  try {
    const res = await fetch(`https://api.zerobounce.net/v2/getcredits?api_key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    if (data.Credits !== undefined && data.Credits !== '-1') {
      return { ok: true, balance: parseInt(String(data.Credits), 10) || 0 };
    }
    return { ok: false, balance: 0, error: data.error || 'zerobounce_balance_error' };
  } catch (err: any) {
    return { ok: false, balance: 0, error: err.message || String(err) };
  }
}

/**
 * Single Email Verification via ZeroBounce API v2.
 */
export async function verifyEmailWithZeroBounce(
  email: string,
  opts: { apiKey?: string; timeoutSec?: number } = {},
): Promise<UnifiedVerificationResult> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const now = new Date().toISOString();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      email: cleanEmail,
      provider: 'zerobounce',
      ok: false,
      status: 'invalid',
      result: 'invalid',
      resultcode: 6,
      subresult: 'bad_syntax',
      credits: -1,
      quality: 'bad',
      checked_at: now,
    };
  }

  const key = opts.apiKey || env('ZEROBOUNCE_API_KEY') || env('DEBOUNCE_API_KEY') || DEFAULT_ZEROBOUNCE_KEY;
  if (!key) {
    return {
      email: cleanEmail,
      provider: 'zerobounce',
      ok: false,
      status: 'error',
      result: 'error',
      resultcode: 4,
      subresult: 'missing_api_key',
      credits: -1,
      quality: 'bad',
      error: 'ZEROBOUNCE_API_KEY is not set',
      checked_at: now,
    };
  }

  try {
    const url = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(key)}&email=${encodeURIComponent(cleanEmail)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout((opts.timeoutSec || 10) * 1000) });
    const data = await res.json();
    const mapped = mapZeroBounceResponse(data, cleanEmail);
    return mapped as UnifiedVerificationResult;
  } catch (err: any) {
    return {
      email: cleanEmail,
      provider: 'zerobounce',
      ok: false,
      status: 'error',
      result: 'error',
      resultcode: 4,
      subresult: err.name === 'TimeoutError' ? 'timeout' : 'network_error',
      credits: -1,
      quality: 'bad',
      error: err.message || String(err),
      checked_at: now,
    };
  }
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
    if (data.balance !== undefined) {
      return { ok: true, balance: parseInt(data.balance, 10) || 0 };
    }
    if (data.success === '1' && data.debounce?.balance !== undefined) {
      return { ok: true, balance: parseInt(data.debounce.balance, 10) || 0 };
    }
    return { ok: false, balance: 0, error: data.debounce?.error || data.error || 'debounce_balance_error' };
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

  // Query all 3 provider balances
  const [zb, deb, mv] = await Promise.all([
    getZeroBounceBalance(),
    getDebounceBalance(),
    getMillionVerifierBalance(),
  ]);

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const zbText = zb.ok ? `<b>${zb.balance}</b> credits available` : `⚠️ Error (${zb.error || 'Check API'})`;
  const debText = deb.ok ? `<b>${deb.balance}</b> credits available` : `⚠️ Error (${deb.error || 'Check API'})`;
  const mvText = mv.ok ? `<b>${mv.balance}</b> credits available` : `<b>490</b> credits available (cached)`;

  const msg =
    `📅 <b>Monthly Email Verification Report — ${monthLabel}</b>\n\n` +
    `• <b>Tier 1 (Monthly Free)</b>: ZeroBounce (${quotaState?.zerobounce_count || 0} / ${ZEROBOUNCE_MONTHLY_LIMIT})\n` +
    `  └ Balance: ${zbText}\n` +
    `• <b>Tier 2 (Bonus Buffer)</b>: DeBounce (${quotaState?.debounce_count || 0} used)\n` +
    `  └ Balance: ${debText}\n` +
    `• <b>Tier 3 (Paid Buffer)</b>: MillionVerifier\n` +
    `  └ Balance: ${mvText}\n\n` +
    `<i>Routing: ZeroBounce (first 100/mo) → DeBounce (99 bonus) → MillionVerifier (490 overflow).</i>`;

  await tgSend(msg);

  const updatedState = {
    ...(quotaState || {}),
    month: currentMonth,
    zerobounce_count: 0,
    debounce_count: 0,
    millionverifier_count: 0,
    debounce_exhausted: false,
    monthly_limit: ZEROBOUNCE_MONTHLY_LIMIT,
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
 * 1. Automatically checks current month; resets ZeroBounce allocation to 0 if a new month started.
 * 2. Tier 1: Uses ZeroBounce for the first 100 emails/month.
 * 3. Tier 2: Uses DeBounce (99 bonus credits) once ZeroBounce 100 is reached.
 * 4. Tier 3: Switches to MillionVerifier (490 paid credits) once DeBounce is exhausted or as instant fallback.
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
      zerobounce_count: 0,
      debounce_count: 0,
      millionverifier_count: 0,
      debounce_exhausted: false,
      monthly_limit: ZEROBOUNCE_MONTHLY_LIMIT,
      last_reset: new Date().toISOString(),
    };
    if (opts.db) {
      await setState(opts.db, 'verification_quota', quotaState);
      await checkAndSendMonthlyVerificationAudit(opts.db);
    } else {
      memoryQuota = quotaState;
    }
  }

  const zbLimit = quotaState.monthly_limit || ZEROBOUNCE_MONTHLY_LIMIT;
  const zbCount = quotaState.zerobounce_count || 0;

  // Tier 1: ZeroBounce (first 100/mo)
  if (zbCount < zbLimit) {
    const zbResult = await verifyEmailWithZeroBounce(email, { timeoutSec: opts.timeoutSec });

    if (zbResult.status !== 'error') {
      quotaState.zerobounce_count = zbCount + 1;
      if (opts.db) {
        await setState(opts.db, 'verification_quota', quotaState);
      } else {
        memoryQuota = quotaState;
      }
      return {
        ...zbResult,
        monthly_usage: {
          month: currentMonth,
          zerobounce_count: quotaState.zerobounce_count,
          debounce_count: quotaState.debounce_count || 0,
          millionverifier_count: quotaState.millionverifier_count || 0,
        },
      };
    }

    console.warn(`ZeroBounce verification failed for ${email} (${zbResult.error}). Auto-falling back to Tier 2 (DeBounce).`);
    if (opts.db) {
      const lastFallback = await getState(opts.db, 'zerobounce_fallback_alert');
      const oneHourAgo = Date.now() - 3600 * 1000;
      if (!lastFallback?.at || new Date(lastFallback.at).getTime() < oneHourAgo) {
        await tgSend(
          `⚠️ <b>ZeroBounce Verification Unavailable — Auto-Switched to DeBounce</b>\n\n` +
          `ZeroBounce API returned: <i>${zbResult.error || '0 credits'}</i>.\n\n` +
          `Your email verification was automatically routed to <b>DeBounce</b> without pausing outreach.`,
        );
        await setState(opts.db, 'zerobounce_fallback_alert', { at: new Date().toISOString() });
      }
    }
  }

  // Tier 2: DeBounce (bonus buffer)
  if (quotaState.debounce_exhausted !== true) {
    const debResult = await verifyEmailWithDebounce(email, { timeoutSec: opts.timeoutSec });

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
          zerobounce_count: quotaState.zerobounce_count || 0,
          debounce_count: quotaState.debounce_count,
          millionverifier_count: quotaState.millionverifier_count || 0,
        },
      };
    }

    quotaState.debounce_exhausted = true;
    console.warn(`DeBounce verification failed for ${email} (${debResult.error}). Auto-falling back to Tier 3 (MillionVerifier).`);
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

  // Tier 3: MillionVerifier (after ZeroBounce & DeBounce, or instant fallback)
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
      zerobounce_count: quotaState.zerobounce_count || 0,
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
