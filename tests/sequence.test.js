import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sequenceState, canSend, nextSendSlot, effectiveCap, inSendWindow, zonedTimeToUtc, localParts,
  DEFAULT_SETTINGS, italianHolidays, nurtureDate,
} from '../supabase/functions/_shared/core/index.js';

const rome = (y, m, d, hh = 10, mm = 0) => zonedTimeToUtc(y, m, d, hh, mm, 'Europe/Rome');
const P = (o = {}) => ({ id: 'p1', status: 'ready', email: 'anna@studio.it', ...o });
const sent = (step, at, extra = {}) => ({ prospect_id: 'p1', direction: 'out', step_name: step, state: 'sent', sent_at: at.toISOString(), channel: 'email', ...extra });
const S = { ...DEFAULT_SETTINGS, season_mode: 'normal' };

test('T1 is due immediately for a Ready prospect', () => {
  const now = rome(2026, 10, 6);
  const st = sequenceState(P(), [], S, now);
  assert.equal(st.active, true);
  assert.equal(st.step.key, 'T1_intro');
  assert.equal(st.isDue, true);
});

test('Researching prospects are not in the sequence', () => {
  assert.equal(sequenceState(P({ status: 'researching' }), [], S).active, false);
});

test('missing email blocks email steps', () => {
  const st = sequenceState(P({ email: '' }), [], S, rome(2026, 10, 6));
  assert.equal(st.blocked, 'no_email');
});

test('cadence offsets: email-only T1 -> T3 day 4 (T4 disabled by default), and legacy T2_ig_dm is stripped', () => {
  const t1 = rome(2026, 10, 6);
  let st = sequenceState(P({ status: 't1_sent' }), [sent('T1_intro', t1)], S, rome(2026, 10, 7));
  assert.equal(st.step.key, 'T3_followup');
  assert.equal(st.dueAt.getTime(), t1.getTime() + 4 * 86400000);
  assert.equal(st.isDue, false);

  st = sequenceState(P({ status: 't1_sent' }), [sent('T1_intro', t1)], S, rome(2026, 10, 11));
  assert.equal(st.step.key, 'T3_followup');
  assert.equal(st.isDue, true);

  // By default T4_breakup is disabled, so sequence completes after T3_followup
  st = sequenceState(P({ status: 't3_sent' }), [sent('T1_intro', t1), sent('T3_followup', t1)], S, t1);
  assert.equal(st.active, false);
  assert.equal(st.reason, 'completed');

  // Even if legacy settings had T2_ig_dm in steps, withDefaults strips it automatically
  const SWithLegacyIg = { ...S, steps: [...S.steps, { key: 'T2_ig_dm', label: 'Instagram DM', day: 3, channel: 'instagram_dm', enabled: true }] };
  const stStripped = sequenceState(P({ status: 't1_sent' }), [sent('T1_intro', t1)], SWithLegacyIg, rome(2026, 10, 7));
  assert.equal(stStripped.step.key, 'T3_followup');
});

test('a real reply stops the sequence; an out-of-office does not', () => {
  const t1 = rome(2026, 10, 6);
  const reply = { prospect_id: 'p1', direction: 'in', channel: 'email', reply_sentiment: 'positive', created_at: t1.toISOString() };
  assert.equal(sequenceState(P({ status: 't1_sent' }), [sent('T1_intro', t1), reply], S, t1).reason, 'replied');
  const ooo = { ...reply, reply_sentiment: 'ooo' };
  const resume = rome(2026, 10, 20);
  const st = sequenceState(P({ status: 't1_sent', resume_at: resume.toISOString() }), [sent('T1_intro', t1), ooo], S, rome(2026, 10, 10));
  assert.equal(st.active, true);
  assert.equal(st.dueAt.getTime(), resume.getTime(), 'OOO pushes the next step to the return date');
});

test('do-not-contact is never sequenced or sent', () => {
  const p = P({ do_not_contact: true });
  assert.equal(sequenceState(p, [], S).reason, 'do_not_contact');
  const touch = { step_name: 'T1_intro', channel: 'email', state: 'approved' };
  assert.equal(canSend(touch, p, [], S, { now: rome(2026, 10, 6) }).reason, 'do_not_contact');
});

test('canSend gates: approval, kill switch, window, holiday, cap, season, bounce, reply', () => {
  const tue10 = rome(2026, 10, 6, 10, 0);
  const t = { step_name: 'T1_intro', channel: 'email', state: 'approved', scheduled_at: tue10.toISOString() };
  assert.deepEqual(canSend(t, P(), [], S, { now: tue10 }), { ok: true });
  assert.equal(canSend({ ...t, state: 'draft' }, P(), [], S, { now: tue10 }).reason, 'not_approved');
  assert.equal(canSend(t, P(), [], { ...S, kill_switch: true }, { now: tue10 }).reason, 'kill_switch');
  assert.equal(canSend(t, P(), [], S, { now: rome(2026, 10, 10, 10) }).reason, 'outside_window', 'Saturday');
  assert.equal(canSend(t, P(), [], S, { now: rome(2026, 10, 6, 14) }).reason, 'outside_window', 'afternoon');
  assert.equal(canSend({ ...t, scheduled_at: null }, P(), [], S, { now: rome(2026, 12, 8, 10) }).reason, 'outside_window', 'Immacolata is a holiday');
  assert.equal(canSend(t, P(), [], S, { now: tue10, sentToday: 6 }).reason, 'daily_cap', 'warm-up week 1 cap is 6');
  assert.equal(canSend(t, P(), [], { ...S, season_mode: 'paused' }, { now: tue10 }).reason, 'season_paused');
  assert.equal(canSend(t, P(), [], S, { now: tue10, sentTotal: 40, bouncedTotal: 2 }).reason, 'bounce_pause');
  assert.equal(canSend(t, P(), [], S, { now: tue10, sentTotal: 40, bouncedTotal: 1 }).ok, true, '2.5% is under the 3% limit');
  const reply = { direction: 'in', reply_sentiment: 'neutral' };
  assert.equal(canSend(t, P(), [reply], S, { now: tue10 }).reason, 'replied');
  assert.equal(canSend({ ...t, scheduled_at: rome(2026, 10, 6, 11).toISOString() }, P(), [], S, { now: tue10 }).reason, 'not_due');
});

test('replies to a planner skip windows and caps but never DND or the kill switch', () => {
  const sat = rome(2026, 10, 10, 22);
  const t = { step_name: 'rate_card_delivery', channel: 'email', state: 'approved' };
  assert.equal(canSend(t, P(), [{ direction: 'in', reply_sentiment: 'positive' }], S, { now: sat, sentToday: 99 }).ok, true);
  assert.equal(canSend(t, P(), [], { ...S, kill_switch: true }, { now: sat }).reason, 'kill_switch');
  assert.equal(canSend(t, P({ unsubscribed_at: '2026-10-01' }), [], S, { now: sat }).reason, 'do_not_contact');
});

test('nextSendSlot lands inside the Tue-Thu window, spaces sends, respects caps and holidays', () => {
  const rng = () => 0.5;
  const mon = rome(2026, 10, 5, 8, 0);
  const s1 = nextSendSlot(mon, S, [], { rng });
  const p1 = localParts(s1, 'Europe/Rome');
  assert.equal(p1.dow, 2, 'Tuesday');
  assert.ok(p1.hh === 9 || (p1.hh === 10 && p1.mm <= 30) || p1.hh < 11);
  assert.ok(inSendWindow(s1, S));
  const s2 = nextSendSlot(mon, S, [s1], { rng });
  assert.ok(s2 - s1 >= DEFAULT_SETTINGS.jitter_min * 60000, 'jitter between sends');
  const six = Array.from({ length: 6 }, (_, i) => new Date(s1.getTime() + i * 600000));
  const s7 = nextSendSlot(mon, S, six, { rng });
  assert.equal(localParts(s7, 'Europe/Rome').dow, 3, 'cap of 6 full: moves to Wednesday');
  const s8 = nextSendSlot(rome(2026, 12, 7, 12), S, [], { rng });
  assert.equal(localParts(s8, 'Europe/Rome').d, 9, '8 December is skipped');
});

test('effectiveCap: warm-up grows weekly, season halves, paused is zero', () => {
  const first = rome(2026, 10, 6);
  assert.equal(effectiveCap(S, first, first), 6);
  assert.equal(effectiveCap(S, rome(2026, 10, 14), first), 9);
  assert.equal(effectiveCap(S, rome(2026, 11, 20), first), 12, 'never above daily_cap');
  assert.equal(effectiveCap({ ...S, season_mode: 'auto', warmup: { enabled: false } }, rome(2027, 7, 6)), 6, 'July: half speed');
  assert.equal(effectiveCap({ ...S, season_mode: 'auto', warmup: { enabled: false } }, rome(2027, 1, 12)), 12, 'January: full speed');
  assert.equal(effectiveCap({ ...S, season_mode: 'paused' }, first), 0);
});

test('time zone and holidays', () => {
  assert.equal(zonedTimeToUtc(2026, 3, 29, 9, 0, 'Europe/Rome').toISOString(), '2026-03-29T07:00:00.000Z', 'DST start');
  assert.equal(zonedTimeToUtc(2026, 1, 15, 9, 0, 'Europe/Rome').toISOString(), '2026-01-15T08:00:00.000Z');
  assert.ok(italianHolidays(2026).has('2026-04-06'), 'Easter Monday 2026');
  assert.ok(italianHolidays(2027).has('2027-03-29'), 'Easter Monday 2027');
  assert.equal(nurtureDate(rome(2026, 10, 6)).toISOString().slice(0, 10), '2027-10-01');
});

import { scheduleApproved, statusAfterSend, FUNNEL_RANK } from '../supabase/functions/_shared/core/index.js';

test('approval scheduling and status moves', () => {
  const now = rome(2026, 10, 10, 15); // Saturday afternoon
  const at = scheduleApproved({ channel: 'email', step_name: 'T1_intro' }, P(), S, [], { now, rng: () => 0 });
  assert.equal(localParts(at, 'Europe/Rome').dow, 2, 'Saturday approval goes out Tuesday');
  assert.equal(scheduleApproved({ channel: 'email', step_name: 'rate_card_delivery' }, P(), S, [], { now }).getTime(), now.getTime());
  assert.equal(scheduleApproved({ channel: 'whatsapp', step_name: 'custom' }, P(), S, [], { now }), null);
  assert.equal(statusAfterSend('ready', 'T1_intro', FUNNEL_RANK), 't1_sent');
  assert.equal(statusAfterSend('t1_sent', 'T3_followup', FUNNEL_RANK), 't3_sent');
  assert.equal(statusAfterSend('replied', 'T3_followup', FUNNEL_RANK), 'replied', 'never backwards');
  assert.equal(statusAfterSend('replied', 'rate_card_delivery', FUNNEL_RANK), 'rate_card_sent');
});
