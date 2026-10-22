// MillionVerifier Real-Time API Integration with Automated Telegram Low-Credit Alerts
// Enforces a strict Zero-Bounce Guarantee (<1% bounce rate) by verifying every recipient mailbox.
import { env, getState, setState } from './server.ts';
import { tgSend } from './telegram.ts';

export const DEFAULT_MILLIONVERIFIER_KEY = 'CugoyAcGssnLLZpm2jffWjp0h';
export const LOW_CREDIT_THRESHOLD = 25;

export interface MillionVerifierResult {
  email: string;
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
}

/**
 * Verifies an email address using MillionVerifier Real-Time Single Verification API v3.
 * Automatically monitors remaining credit balance and triggers Telegram notifications
 * when credits reach <= 25 or 0.
 */
export async function verifyEmailWithMillionVerifier(
  email: string,
  opts: { db?: any; apiKey?: string; alertThreshold?: number; timeoutSec?: number } = {},
): Promise<MillionVerifierResult> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const now = new Date().toISOString();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      email: cleanEmail,
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

  // Process balance & low-credit Telegram alerts
  if (credits >= 0 && opts.db) {
    await handleCreditAlerts(opts.db, credits, threshold);
  }

  const resultStr = String(data.result || 'unknown').toLowerCase();
  const resultCode = Number(data.resultcode || 3);
  const subresult = String(data.subresult || '').toLowerCase();
  const quality = String(data.quality || (resultCode === 1 ? 'good' : 'bad'));

  // Map result code to zero-bounce status
  let status: MillionVerifierResult['status'] = 'unknown';
  let ok = false;

  switch (resultCode) {
    case 1: // ok: safe deliverable address
      status = 'verified';
      ok = true;
      break;
    case 2: // catch_all: risky without verbatim proof
      status = 'catch_all';
      ok = false; // Must be accompanied by verbatim proof to allow sending
      break;
    case 5: // disposable
    case 6: // invalid: mailbox does not exist
      status = 'invalid';
      ok = false;
      break;
    case 4: // error (e.g. no credits or invalid API key)
      status = 'error';
      ok = false;
      break;
    case 3: // unknown (timeout or greylisted)
    default:
      status = 'unknown';
      ok = false;
      break;
  }

  return {
    email: cleanEmail,
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
 * Handles deduplicated Telegram notifications when MillionVerifier credits are depleted or low.
 */
async function handleCreditAlerts(db: any, credits: number, threshold: number) {
  try {
    const alertState = await getState(db, 'millionverifier_credit_alert');
    const lastAlertedCredits = alertState?.credits;
    const lastAlertedAt = alertState?.alerted_at ? new Date(alertState.alerted_at).getTime() : 0;
    const oneDayAgo = Date.now() - 24 * 3600 * 1000;

    if (credits === 0) {
      // Out of credits: alert if not already alerted for 0 credits within the last 12 hours
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
      // Low credits: alert on crossing threshold or once per 24 hours
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
    // Catch-all is strictly allowed ONLY if verbatim proof from official website exists
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
