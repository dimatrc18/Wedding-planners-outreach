// Sequence engine: which step is next for a prospect, when it may be sent, and whether a send is allowed.
// Every send path (browser "Send now", the cron sender, Telegram) goes through canSend().

import { DEFAULT_SETTINGS, DEFAULT_STEPS, SEQUENCE_STAGES } from './constants.js';
import { localParts, zonedTimeToUtc, localDateKey, isItalianHoliday, parseHHMM, daysBetween, addDays, ymd } from './time.js';

export const COLD_STEPS = ['T1_intro', 'T2_ig_dm', 'T3_followup', 'T4_breakup'];
const PENDING_STATES = ['draft', 'approved'];

export const withDefaults = (s) => ({ ...DEFAULT_SETTINGS, ...(s || {}), warmup: { ...DEFAULT_SETTINGS.warmup, ...((s || {}).warmup || {}) } });

export function isBlocked(p) {
  return !!(p.do_not_contact || p.unsubscribed_at || p.status === 'do_not_contact');
}

// An inbound message that is a real human reply (not an auto-reply, not a bounce).
export function isRealReply(t) {
  return t.direction === 'in' && !t.bounced && t.reply_sentiment !== 'ooo';
}
export const hasRealReply = (touches) => touches.some(isRealReply);

function sequenceAnchor(outs) {
  const sent = outs.filter((t) => COLD_STEPS.includes(t.step_name) && t.state === 'sent' && t.sent_at)
    .map((t) => new Date(t.sent_at).getTime());
  if (sent.length) return new Date(Math.min(...sent));
  const skipped = outs.filter((t) => COLD_STEPS.includes(t.step_name) && t.state === 'skipped')
    .map((t) => new Date(t.updated_at || t.created_at).getTime());
  return skipped.length ? new Date(Math.min(...skipped)) : null;
}

/**
 * Where a prospect stands in the cadence.
 * Returns { active, reason?, step?, dueAt?, isDue?, pending?, blocked? }
 */
export function sequenceState(prospect, touches = [], settings = DEFAULT_SETTINGS, now = new Date()) {
  const s = withDefaults(settings);
  const steps = (s.steps || DEFAULT_STEPS).filter((x) => x.enabled !== false);
  if (isBlocked(prospect)) return { active: false, reason: 'do_not_contact' };
  if (hasRealReply(touches)) return { active: false, reason: 'replied' };
  if (prospect.sequence_paused) return { active: false, reason: 'paused' };
  if (!SEQUENCE_STAGES.includes(prospect.status)) return { active: false, reason: 'stage' };

  const outs = touches.filter((t) => t.direction === 'out');
  const anchor = sequenceAnchor(outs);
  for (const step of steps) {
    const ts = outs.filter((t) => t.step_name === step.key);
    if (ts.some((t) => t.state === 'sent' || t.state === 'skipped')) continue;
    if (step.channel === 'instagram_dm' && !prospect.instagram_handle) continue; // nothing to DM: skip the step
    const pending = ts.find((t) => PENDING_STATES.includes(t.state)) || null;
    if (step.channel === 'email' && !prospect.email) {
      return { active: true, step, pending, blocked: 'no_email', dueAt: null, isDue: false };
    }
    let due = anchor ? addDays(anchor, step.day) : new Date(now);
    for (const hold of [prospect.snoozed_until, prospect.resume_at]) {
      if (hold && new Date(hold) > due) due = new Date(hold);
    }
    return { active: true, step, pending, dueAt: due, isDue: due <= now };
  }
  return { active: false, reason: 'completed' };
}

// Daily cap after warm-up and season slow-down. 0 means sending is paused.
export function effectiveCap(settings, onDate = new Date(), firstSendAt = null) {
  const s = withDefaults(settings);
  let cap = s.daily_cap;
  if (s.warmup.enabled) {
    const weeks = firstSendAt ? Math.max(0, Math.floor(daysBetween(firstSendAt, onDate) / 7)) : 0;
    cap = Math.min(cap, s.warmup.start + weeks * s.warmup.weekly_increment);
  }
  const month = localParts(onDate, s.timezone).m;
  if (s.season_mode === 'paused') return 0;
  if (s.season_mode === 'slow' || (s.season_mode === 'auto' && month >= 5 && month <= 9)) cap = Math.ceil(cap / 2);
  return Math.max(0, cap);
}

export const isPeakSeason = (date = new Date(), tz = 'Europe/Rome') => { const m = localParts(date, tz).m; return m >= 5 && m <= 9; };

function windowFor(p, s, tz) {
  const a = parseHHMM(s.window_start), b = parseHHMM(s.window_end);
  return [zonedTimeToUtc(p.y, p.m, p.d, a.hh, a.mm, tz), zonedTimeToUtc(p.y, p.m, p.d, b.hh, b.mm, tz)];
}

export function isSendDay(date, settings, tz) {
  const s = withDefaults(settings);
  const p = localParts(date, tz || s.timezone);
  return s.send_days.includes(p.dow) && !isItalianHoliday(ymd(p));
}

export function inSendWindow(date, settings, tz) {
  const s = withDefaults(settings);
  tz = tz || s.timezone;
  if (!isSendDay(date, s, tz)) return false;
  const [ws, we] = windowFor(localParts(date, tz), s, tz);
  return date >= ws && date <= we;
}

/**
 * Earliest allowed send time at or after `after`.
 * `taken` = times of sends already scheduled or sent (any prospect); used for caps and spacing.
 */
export function nextSendSlot(after, settings, taken = [], { tz, rng = Math.random, firstSendAt = null, maxDays = 120 } = {}) {
  const s = withDefaults(settings);
  tz = tz || s.timezone;
  const minutes = (n) => n * 60000;
  let cursor = new Date(after);
  for (let i = 0; i < maxDays; i++) {
    const p = localParts(cursor, tz);
    const [ws, we] = windowFor(p, s, tz);
    const nextDay = () => zonedTimeToUtc(p.y, p.m, p.d + 1, 0, 0, tz);
    if (!s.send_days.includes(p.dow) || isItalianHoliday(ymd(p)) || cursor > we) { cursor = nextDay(); continue; }
    const capKey = localDateKey(cursor, s.timezone);
    const cap = effectiveCap(s, cursor, firstSendAt);
    const sameDay = taken.map((t) => new Date(t)).filter((t) => localDateKey(t, s.timezone) === capKey);
    if (sameDay.length >= cap) { cursor = nextDay(); continue; }
    const jitter = minutes(s.jitter_min + rng() * (s.jitter_max - s.jitter_min));
    let t = new Date(Math.max(cursor.getTime(), ws.getTime()));
    const last = sameDay.length ? Math.max(...sameDay.map((d) => d.getTime())) : null;
    if (last !== null && t.getTime() < last + jitter) t = new Date(last + jitter);
    else if (last === null && t.getTime() === ws.getTime()) t = new Date(ws.getTime() + rng() * minutes(s.jitter_max));
    if (t > we) { cursor = nextDay(); continue; }
    return t;
  }
  return null;
}

/**
 * The single gate every send passes through.
 * ctx: { now, sentToday, firstSendAt, sentTotal, bouncedTotal }
 * Cold steps (T1..T4) obey windows, caps and reply checks; replies to a planner obey kill switch and DND only.
 */
export function canSend(touch, prospect, touches, settings, ctx = {}) {
  const s = withDefaults(settings);
  const now = ctx.now || new Date();
  const cold = COLD_STEPS.includes(touch.step_name);
  if (s.kill_switch) return { ok: false, reason: 'kill_switch' };
  if (isBlocked(prospect)) return { ok: false, reason: 'do_not_contact' };
  if (touch.state !== 'approved') return { ok: false, reason: 'not_approved' };
  if (touch.channel !== 'email') return { ok: false, reason: 'manual_channel' };
  if (!prospect.email) return { ok: false, reason: 'no_email' };
  if ((ctx.sentTotal || 0) >= s.bounce_min_sample && (ctx.bouncedTotal || 0) / ctx.sentTotal > s.bounce_pause_rate) {
    return { ok: false, reason: 'bounce_pause' };
  }
  if (!cold) return { ok: true };
  if (hasRealReply(touches)) return { ok: false, reason: 'replied' };
  if (prospect.sequence_paused) return { ok: false, reason: 'paused' };
  const cap = effectiveCap(s, now, ctx.firstSendAt);
  if (cap === 0) return { ok: false, reason: 'season_paused' };
  if (touch.scheduled_at && new Date(touch.scheduled_at) > now) return { ok: false, reason: 'not_due' };
  if (!inSendWindow(now, s, prospect.timezone || s.timezone)) return { ok: false, reason: 'outside_window' };
  if ((ctx.sentToday || 0) >= cap) return { ok: false, reason: 'daily_cap' };
  return { ok: true };
}

export const BLOCK_REASONS = {
  kill_switch: 'Kill switch is on',
  do_not_contact: 'Do not contact',
  not_approved: 'Not approved yet',
  manual_channel: 'Send this one by hand',
  no_email: 'No email address',
  bounce_pause: 'Paused: bounce rate above limit',
  replied: 'Planner replied, sequence stopped',
  paused: 'Sequence paused',
  season_paused: 'Campaign paused for the season',
  not_due: 'Scheduled for later',
  outside_window: 'Outside the send window',
  daily_cap: 'Daily cap reached',
};

// Nurture date: the date the planner gave, else the configured month-day of next year.
export function nurtureDate(now = new Date(), settings = DEFAULT_SETTINGS, given = null) {
  if (given) return new Date(given);
  const [m, d] = withDefaults(settings).nurture_month_day.split('-').map(Number);
  const y = localParts(now).y + 1;
  return zonedTimeToUtc(y, m, d, 9, 0, 'Europe/Rome');
}

/**
 * Send time for a touch that was just approved.
 * Cold emails get the next free slot in the send window; replies to a planner go out right away;
 * manual channels (Instagram, WhatsApp, calls) get no send time because a person sends them.
 */
export function scheduleApproved(touch, prospect, settings, taken = [], { now = new Date(), firstSendAt = null, rng } = {}) {
  if (touch.channel !== 'email') return null;
  if (!COLD_STEPS.includes(touch.step_name)) return now;
  const s = withDefaults(settings);
  return nextSendSlot(now, s, taken, { tz: prospect.timezone || s.timezone, firstSendAt, rng });
}

// Cold email send times already used (scheduled or sent), the input nextSendSlot needs.
export function takenSlots(touches, now = new Date()) {
  const from = now.getTime() - 2 * 86400000;
  return touches.filter((t) => t.direction === 'out' && t.channel === 'email' && COLD_STEPS.includes(t.step_name) &&
    ((t.state === 'sent' && t.sent_at) || (t.state === 'approved' && t.scheduled_at)))
    .map((t) => new Date(t.state === 'sent' ? t.sent_at : t.scheduled_at)).filter((d) => d.getTime() >= from);
}

export function firstColdSend(touches) {
  const xs = touches.filter((t) => t.direction === 'out' && t.state === 'sent' && t.channel === 'email' && COLD_STEPS.includes(t.step_name) && t.sent_at)
    .map((t) => new Date(t.sent_at).getTime());
  return xs.length ? new Date(Math.min(...xs)) : null;
}

// Status a prospect moves to after a step is sent; never moves a prospect backwards in the funnel.
export function statusAfterSend(current, stepName, rank) {
  const map = { T1_intro: 't1_sent', T2_ig_dm: 't2_sent', T3_followup: 't3_sent', T4_breakup: 't4_sent', rate_card_delivery: 'rate_card_sent' };
  const next = map[stepName];
  if (!next) return current;
  return (rank[next] ?? 0) > (rank[current] ?? 0) || (COLD_STEPS.includes(stepName) && SEQUENCE_STAGES.includes(current)) ? next : current;
}
