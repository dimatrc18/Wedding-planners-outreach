// Dual-Provider Verification Normalization & Routing Rules
// Pure business logic shared between Node (unit tests & CLI) and Deno (Supabase Edge Functions)

export const DEFAULT_DEBOUNCE_KEY = 'c5a1d7317f8e42acb2f1b7bd46dcb832';
export const DEFAULT_MILLIONVERIFIER_KEY = 'CugoyAcGssnLLZpm2jffWjp0h';
export const DEBOUNCE_MONTHLY_LIMIT = 100;
export const LOW_CREDIT_THRESHOLD = 25;

/**
 * Normalizes DeBounce API v1 response payload into the unified zero-bounce schema.
 */
export function mapDebounceResponse(data, email = '') {
  const cleanEmail = String(email || data?.debounce?.email || '').trim().toLowerCase();
  const now = new Date().toISOString();

  if (data?.success === '0' || data?.debounce?.error) {
    return {
      email: cleanEmail,
      provider: 'debounce',
      ok: false,
      status: 'error',
      result: 'error',
      resultcode: 4,
      subresult: data?.debounce?.error || 'api_error',
      credits: 0,
      quality: 'bad',
      error: data?.debounce?.error || 'DeBounce API error',
      checked_at: now,
    };
  }

  const d = data?.debounce || {};
  const code = String(d.code || '7');
  const balance = parseInt(data?.balance, 10) || 0;

  let status = 'unknown';
  let ok = false;
  let resultCode = 3;
  let resultStr = 'unknown';
  let subresult = d.reason || 'unknown';

  switch (code) {
    case '5': // Safe to Send / Valid
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
    case '6': // Invalid / Undeliverable
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
 * Normalizes MillionVerifier API v3 response payload into the unified zero-bounce schema.
 */
export function mapMillionVerifierResponse(data, email = '') {
  const cleanEmail = String(email || data?.email || '').trim().toLowerCase();
  const now = new Date().toISOString();

  const resultCode = Number(data?.resultcode || 3);
  const resultStr = String(data?.result || 'unknown').toLowerCase();
  const subresult = String(data?.subresult || '').toLowerCase();
  const credits = typeof data?.credits === 'number' ? data.credits : -1;
  const quality = String(data?.quality || (resultCode === 1 ? 'good' : 'bad'));

  let status = 'unknown';
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
    error: data?.error || undefined,
    checked_at: now,
  };
}

/**
 * Routing logic for the Dual-Provider gateway:
 * - Checks month transition and resets DeBounce allocation when month changes.
 * - Routes to DeBounce for the first 100 emails of each calendar month.
 * - Routes to MillionVerifier once 100 is reached.
 */
export function determineVerificationProvider(quotaState, currentMonth = new Date().toISOString().slice(0, 7), limit = DEBOUNCE_MONTHLY_LIMIT) {
  let state = { ...(quotaState || {}) };
  let resetNeeded = false;

  if (!state.month || state.month !== currentMonth) {
    state = {
      month: currentMonth,
      debounce_count: 0,
      millionverifier_count: 0,
      monthly_limit: limit,
      last_reset: new Date().toISOString(),
    };
    resetNeeded = true;
  }

  const debLimit = state.monthly_limit || limit;
  const provider = (state.debounce_count || 0) < debLimit ? 'debounce' : 'millionverifier';

  return {
    provider,
    resetNeeded,
    quotaState: state,
  };
}
