import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sequenceState, canSend, nextSendSlot, effectiveCap, inSendWindow, zonedTimeToUtc, localParts,
  DEFAULT_SETTINGS, italianHolidays, nurtureDate, sortDueTouchesWithMarketBalancer,
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
  assert.equal(canSend(t, P(), [], S, { now: tue10, sentTotal: 60, bouncedTotal: 1 }).ok, true, '1.67% is under the 2% limit');
  const reply = { direction: 'in', reply_sentiment: 'neutral' };
  assert.equal(canSend(t, P(), [reply], S, { now: tue10 }).reason, 'replied');
  assert.equal(canSend({ ...t, scheduled_at: rome(2026, 10, 6, 11).toISOString() }, P(), [], S, { now: tue10 }).reason, 'not_due');
  assert.equal(canSend(t, P({ email_status: 'bounced' }), [], S, { now: tue10 }).reason, 'bounced_email');
  assert.equal(canSend(t, P({ email_status: 'invalid' }), [], S, { now: tue10 }).reason, 'invalid_email');
  assert.equal(canSend(t, P({ email_status: 'no_mx' }), [], S, { now: tue10 }).reason, 'invalid_email');
  assert.equal(canSend(t, P({ website_status: 'broken' }), [], S, { now: tue10 }).reason, 'broken_website');
  assert.equal(canSend(t, P({ enrichment: { known_bad_emails: ['anna@studio.it'] } }), [], S, { now: tue10 }).reason, 'known_bad_email');
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

  // Timezone-aware scheduling: KZ lands in Almaty morning, UAE in Dubai morning, US in NY morning
  const kzProspect = P({ market: 'kz', location: 'Almaty' });
  const kzSend = scheduleApproved({ channel: 'email', step_name: 'T1_intro' }, kzProspect, S, [], { now, rng: () => 0 });
  const kzLocal = localParts(kzSend, 'Asia/Almaty');
  assert.equal(kzLocal.dow, 2, 'KZ Tuesday');
  assert.equal(kzLocal.hh, 9, 'KZ lands at 09:00 local Almaty time');

  const usProspect = P({ market: 'us', location: 'New York' });
  const usSend = scheduleApproved({ channel: 'email', step_name: 'T1_intro' }, usProspect, S, [], { now, rng: () => 0 });
  const usLocal = localParts(usSend, 'America/New_York');
  assert.equal(usLocal.dow, 2, 'US Tuesday');
  assert.equal(usLocal.hh, 9, 'US lands at 09:00 local New York time');
});

test('Market-aware queue balancer enforces 70% International / 30% Local send ratio', () => {
  const pmap = new Map([
    ['p_it_1', { id: 'p_it_1', market: 'it', segment: 'boutique_local' }],
    ['p_it_2', { id: 'p_it_2', market: 'it', segment: 'boutique_local' }],
    ['p_uk_1', { id: 'p_uk_1', market: 'uk', segment: 'international' }],
    ['p_us_1', { id: 'p_us_1', market: 'us', segment: 'international' }],
  ]);

  // Scenario 1: Historical imbalance (15 sent to Italy, only 5 to International = 25% intl < 70% target)
  const imbalancedHistory = [
    ...Array.from({ length: 15 }, (_, i) => ({ prospect_id: 'p_it_1', step_name: 'T1_intro', sent_at: '2026-10-10T09:00:00Z' })),
    ...Array.from({ length: 5 }, (_, i) => ({ prospect_id: 'p_uk_1', step_name: 'T1_intro', sent_at: '2026-10-10T10:00:00Z' })),
  ];

  // In the due queue, Italian touch was scheduled earlier (09:00) than International touch (10:00)
  const due = [
    { id: 't_it_early', prospect_id: 'p_it_1', scheduled_at: '2026-10-22T09:00:00Z' },
    { id: 't_uk_later', prospect_id: 'p_uk_1', scheduled_at: '2026-10-22T10:00:00Z' },
    { id: 't_it_late', prospect_id: 'p_it_2', scheduled_at: '2026-10-22T10:30:00Z' },
    { id: 't_us_later', prospect_id: 'p_us_1', scheduled_at: '2026-10-22T11:00:00Z' },
  ];

  const balanced = sortDueTouchesWithMarketBalancer(due, pmap, imbalancedHistory, 0.70);
  assert.equal(balanced[0].id, 't_uk_later', 'First send must be International (UK) to correct ratio');
  assert.equal(balanced[1].id, 't_us_later', 'Second send must be International (US) to correct ratio');
  assert.equal(balanced[2].id, 't_it_early', 'Local Italian touch follows after international priority');
  assert.equal(balanced[3].id, 't_it_late');

  // Scenario 2: Balanced history (15 sent to International, 5 to Italy = 75% intl >= 70% target)
  const balancedHistory = [
    ...Array.from({ length: 15 }, (_, i) => ({ prospect_id: 'p_uk_1', step_name: 'T1_intro', sent_at: '2026-10-10T09:00:00Z' })),
    ...Array.from({ length: 5 }, (_, i) => ({ prospect_id: 'p_it_1', step_name: 'T1_intro', sent_at: '2026-10-10T10:00:00Z' })),
  ];

  const naturalOrder = sortDueTouchesWithMarketBalancer(due, pmap, balancedHistory, 0.70);
  assert.equal(naturalOrder[0].id, 't_it_early', 'When 70% target is satisfied, earliest scheduled timestamp is preserved');
  assert.equal(naturalOrder[1].id, 't_uk_later');
  assert.equal(naturalOrder[2].id, 't_it_late');
  assert.equal(naturalOrder[3].id, 't_us_later');

  // Scenario 3: Failsafe - Only Local touches in queue (must not stall or block)
  const localOnlyDue = [
    { id: 't_it_1', prospect_id: 'p_it_1', scheduled_at: '2026-10-22T09:00:00Z' },
    { id: 't_it_2', prospect_id: 'p_it_2', scheduled_at: '2026-10-22T09:30:00Z' },
  ];
  const localDispatched = sortDueTouchesWithMarketBalancer(localOnlyDue, pmap, imbalancedHistory, 0.70);
  assert.equal(localDispatched.length, 2, 'Local touches are never stalled when no international touches exist');
  assert.equal(localDispatched[0].id, 't_it_1');
});

test('Anti-Flood Protection: sequenceState never auto-drafts a step that has a failed touch', () => {
  const p = P({ status: 'ready' });
  const failedTouch = {
    id: 't_failed_1',
    direction: 'out',
    step_name: 'T1_intro',
    state: 'failed',
    created_at: '2026-10-23T09:00:00Z',
  };
  const st = sequenceState(p, [failedTouch], S, rome(2026, 10, 6, 10, 0));
  assert.equal(st.isDue, false, 'Failed touch must never be considered isDue: true');
  assert.equal(st.blocked, 'failed_touch', 'Step must be marked blocked as failed_touch');
  assert.ok(st.pending, 'Pending should point to the failed touch for human review');
});

test('Anti-Flood Protection: canSend blocks duplicate sends of the same step (step_already_sent)', () => {
  const tue10 = rome(2026, 10, 6, 10, 0);
  const p = P({ status: 't1_sent' });
  const alreadySentTouch = {
    id: 't_sent_1',
    channel: 'email',
    direction: 'out',
    step_name: 'T1_intro',
    state: 'sent',
    sent_at: '2026-10-23T08:00:00Z',
    message_id: '<msg-1@dorogo.eu>',
  };
  const duplicateTouch = {
    id: 't_duplicate_2',
    channel: 'email',
    direction: 'out',
    step_name: 'T1_intro',
    state: 'approved',
    scheduled_at: tue10.toISOString(),
  };

  const gate = canSend(duplicateTouch, p, [alreadySentTouch], S, { now: tue10 });
  assert.equal(gate.ok, false);
  assert.equal(gate.reason, 'step_already_sent', 'canSend must strictly reject sending a step that was already sent');
});

test('Anti-Flood Protection: canSend enforces 24-hour cooldown between cold emails to the same recipient', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const p = P({ status: 't1_sent' });
  const recentTouch = {
    id: 't_sent_earlier',
    channel: 'email',
    direction: 'out',
    step_name: 'T1_intro',
    state: 'sent',
    sent_at: '2026-10-23T10:00:00Z', // 2 hours ago
  };
  const nextColdTouch = {
    id: 't_cold_followup',
    channel: 'email',
    direction: 'out',
    step_name: 'T3_followup',
    state: 'approved',
    scheduled_at: '2026-10-23T12:00:00Z',
  };

  const gate = canSend(nextColdTouch, p, [recentTouch], S, { now });
  assert.equal(gate.ok, false);
  assert.equal(gate.reason, 'recipient_cooldown', 'Must reject cold email sent within 24 hours of another cold email');

  // After 24 hours, cooldown expires
  const after24h = new Date('2026-10-24T10:01:00Z');
  const gateAfter24h = canSend(nextColdTouch, p, [recentTouch], S, { now: after24h });
  // Since it is Saturday outside window it might be outside_window, but NOT recipient_cooldown:
  assert.notEqual(gateAfter24h.reason, 'recipient_cooldown', 'Cooldown should be expired after 24h');
});

test('Anti-Flood Protection: non-cold touches that are already sent cannot be resent', () => {
  const sentReply = {
    id: 't_reply_sent',
    channel: 'email',
    direction: 'out',
    step_name: 'reply',
    state: 'sent',
    sent_at: '2026-10-23T10:00:00Z',
  };
  const gate = canSend(sentReply, P(), [], S);
  assert.equal(gate.ok, false);
  assert.equal(gate.reason, 'touch_already_sent');
});

test('Zero-Hallucination & Authentic Research Gate: canSend blocks generic placeholder hooks and unverified prospects', () => {
  const tue10 = rome(2026, 10, 6, 10, 0);

  // 1. Prospect with status: 'needs_research' is blocked
  const unresearchedProspect = P({ status: 'needs_research' });
  const t1 = { step_name: 'T1_intro', channel: 'email', state: 'approved', scheduled_at: tue10.toISOString(), body: 'Hi Kathy, valid body' };
  const gateResearch = canSend(t1, unresearchedProspect, [], S, { now: tue10 });
  assert.equal(gateResearch.ok, false);
  assert.equal(gateResearch.reason, 'needs_research');

  // 2. Cold touch containing generic fallback formula is strictly blocked
  const genericTouch = {
    step_name: 'T1_intro',
    channel: 'email',
    state: 'approved',
    scheduled_at: tue10.toISOString(),
    body: 'Hi Jessica,\n\nWhen your Australian couples plan multi-day destination weddings in Italy or the French Riviera...\n\nWe operate an executive Mercedes-Benz V-Class fleet.',
  };
  const gateGeneric = canSend(genericTouch, P(), [], S, { now: tue10 });
  assert.equal(gateGeneric.ok, false);
  assert.equal(gateGeneric.reason, 'unverified_generic_hook');

  // 3. Authentic verified hook passes gate
  const verifiedTouch = {
    step_name: 'T1_intro',
    channel: 'email',
    state: 'approved',
    scheduled_at: tue10.toISOString(),
    body: 'Hi Kathy,\n\nFollow your work in Sydney across @eventsbynightingales. Your three decades of luxury event styling and architectural tablescapes set an industry benchmark.\n\nWe operate an executive Mercedes-Benz V-Class fleet.',
  };
  const gateVerified = canSend(verifiedTouch, P(), [], S, { now: tue10 });
  assert.equal(gateVerified.ok, true);
});


