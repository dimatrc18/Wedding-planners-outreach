import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inboundEffects, classifyReply, DEFAULT_SETTINGS, zonedTimeToUtc } from '../supabase/functions/_shared/core/index.js';

const now = zonedTimeToUtc(2026, 10, 7, 10, 0, 'Europe/Rome');
const prospect = { id: 'p1', agency_name: 'Perlee', contact_name: 'Anna Bianchi', email: 'anna@perlee.it', status: 't1_sent', language: 'en' };
const touches = [
  { id: 't1', prospect_id: 'p1', direction: 'out', step_name: 'T1_intro', state: 'sent', channel: 'email', sent_at: '2026-10-06T08:00:00Z' },
  { id: 't2', prospect_id: 'p1', direction: 'out', step_name: 'T2_ig_dm', state: 'draft', channel: 'instagram_dm' },
  { id: 't3', prospect_id: 'p1', direction: 'out', step_name: 'T3_followup', state: 'approved', channel: 'email', scheduled_at: '2026-10-14T08:00:00Z' },
];
const run = (body) => inboundEffects({ prospect, touches, cls: classifyReply({ body }, now), settings: DEFAULT_SETTINGS, now, inbound: { id: 'in1', channel: 'email', subject: 'Re: Guest transport for your Lake Como weddings' } });

test('positive reply: stop cadence, suggest the rate card reply, alert', () => {
  const e = run('Yes please, send it over.');
  assert.deepEqual(e.skipIds.sort(), ['t2', 't3']);
  assert.equal(e.patch.status, 'replied');
  assert.equal(e.alert, true);
  assert.equal(e.draft.step_name, 'rate_card_delivery');
  assert.equal(e.draft.attach_rate_card, true);
  assert.equal(e.draft.subject, 'Re: Guest transport for your Lake Como weddings');
  assert.equal(e.draft.suggested_for, 'in1');
  assert.deepEqual(e.draft.lint.errors, []);
});

test('unsubscribe: do not contact, skip everything', () => {
  const e = run('Please remove me from your list.');
  assert.equal(e.patch.do_not_contact, true);
  assert.equal(e.patch.status, 'do_not_contact');
  assert.equal(e.skipIds.length, 2);
  assert.equal(e.draft, null);
});

test('out of office: no status change, approved sends move after the return date', () => {
  const e = run('I am out of the office until 20 October.');
  assert.equal(e.patch.status, undefined);
  assert.equal(e.skipIds.length, 0);
  assert.equal(e.reschedule.length, 1);
  assert.ok(new Date(e.reschedule[0].scheduled_at) >= new Date('2026-10-21'));
});

test('not now: nurture with a date; pricing: opportunity and quote stage', () => {
  const n = run('Not right now, maybe next season.');
  assert.equal(n.patch.status, 'nurture');
  assert.equal(n.patch.nurture_until.slice(0, 10), '2027-10-01');
  const q = run('What are your prices from Malpensa to Bellagio for 40 guests?');
  assert.equal(q.patch.status, 'quote_requested');
  assert.equal(q.opportunity.prospect_id, 'p1');
  const neg = run('Not interested.');
  assert.equal(neg.draft, null, 'no reply drafted to a plain no-interest');
});
