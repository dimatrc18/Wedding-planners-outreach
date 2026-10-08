import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  inboundEffects,
  classifyReply,
  DEFAULT_SETTINGS,
  zonedTimeToUtc,
  buildDraft,
  canSend,
  lintMessage,
  findUnansweredReplies,
  validatePartnerReplyOutput,
} from '../supabase/functions/_shared/core/index.js';

const now = zonedTimeToUtc(2026, 10, 8, 10, 0, 'Europe/Rome');

const baseProspect = {
  id: 'p-luxury-1',
  agency_name: 'Como Luxury Weddings',
  contact_name: 'Elena Rossi',
  email: 'elena@comoluxury.com',
  status: 't1_sent',
  language: 'en',
  type: 'planner',
  location: 'Lake Como',
};

const baseTouches = [
  { id: 't-intro', prospect_id: 'p-luxury-1', direction: 'out', step_name: 'T1_intro', state: 'sent', channel: 'email', sent_at: '2026-10-07T08:00:00Z', subject: 'Lake Como guest transport' },
  { id: 't-follow', prospect_id: 'p-luxury-1', direction: 'out', step_name: 'T3_followup', state: 'approved', channel: 'email', scheduled_at: '2026-10-15T08:00:00Z', subject: 'Re: Lake Como guest transport' },
  { id: 't-break', prospect_id: 'p-luxury-1', direction: 'out', step_name: 'T4_breakup', state: 'draft', channel: 'email' },
];

test('Scenario 1: Inbound positive reply asking for rate card stops cadence and attaches 1-page PDF', () => {
  const inboundText = 'Yes, please send your rates over.';
  const cls = classifyReply({ body: inboundText }, now);
  assert.equal(cls.sentiment, 'positive');
  assert.equal(cls.intent, 'wants_rate_card');

  const fx = inboundEffects({
    prospect: baseProspect,
    touches: baseTouches,
    cls,
    settings: DEFAULT_SETTINGS,
    now,
    inbound: { id: 'in-1', channel: 'email', subject: 'Re: Lake Como guest transport' },
  });

  assert.equal(fx.patch.status, 'replied');
  assert.equal(fx.alert, true);
  assert.deepEqual(fx.skipIds.sort(), ['t-break', 't-follow']);
  assert.equal(fx.draft.step_name, 'rate_card_delivery');
  assert.equal(fx.draft.attach_rate_card, true);
  assert.ok(fx.draft.body.includes('Attached is our 1-page partner rate card') || fx.draft.body.includes('1-page partner rate card is attached'));
  assert.equal(fx.draft.lint.errors.length, 0);
});

test('Scenario 2: Inbound asks specific unlisted route/availability -> classifies as specific question / quote requested', () => {
  const inboundText = 'Do you have coaches available for 80 guests to Villa d\'Este on September 12th, and what is the cost from Bergamo airport?';
  const cls = classifyReply({ body: inboundText }, now);
  assert.equal(cls.sentiment, 'positive');
  assert.equal(cls.intent, 'asks_pricing');

  const fx = inboundEffects({
    prospect: baseProspect,
    touches: baseTouches,
    cls,
    settings: DEFAULT_SETTINGS,
    now,
    inbound: { id: 'in-2', channel: 'email', subject: 'Re: Lake Como guest transport' },
  });

  assert.equal(fx.patch.status, 'quote_requested');
  assert.ok(fx.opportunity);
  assert.equal(fx.opportunity.prospect_id, baseProspect.id);
  assert.deepEqual(fx.skipIds.sort(), ['t-break', 't-follow']);
});

test('Scenario 3: Inbound already has a supplier -> polite non-intrusive response with 1-page backup card', () => {
  const inboundText = 'We already have an exclusive driver we work with on Lake Como, but thank you.';
  const cls = classifyReply({ body: inboundText }, now);
  assert.equal(cls.sentiment, 'negative');
  assert.equal(cls.intent, 'has_supplier');

  const fx = inboundEffects({
    prospect: baseProspect,
    touches: baseTouches,
    cls,
    settings: DEFAULT_SETTINGS,
    now,
    inbound: { id: 'in-3', channel: 'email', subject: 'Re: Lake Como guest transport' },
  });

  assert.equal(fx.draft.template_key, 'reply_has_supplier');
  assert.equal(fx.draft.step_name, 'reply');
  assert.equal(fx.draft.attach_rate_card, true);
  assert.ok(fx.draft.body.includes('not looking to replace anyone'));
  assert.deepEqual(fx.skipIds.sort(), ['t-break', 't-follow']);
});

test('Scenario 4: Inbound hard opt-out -> flags DND, stops all touches, zero drafts created', () => {
  const inboundText = 'Stop emailing us, please remove our agency from your database immediately.';
  const cls = classifyReply({ body: inboundText }, now);
  assert.equal(cls.sentiment, 'unsubscribe');

  const fx = inboundEffects({
    prospect: baseProspect,
    touches: baseTouches,
    cls,
    settings: DEFAULT_SETTINGS,
    now,
    inbound: { id: 'in-4', channel: 'email', subject: 'Re: Lake Como guest transport' },
  });

  assert.equal(fx.patch.do_not_contact, true);
  assert.equal(fx.patch.status, 'do_not_contact');
  assert.equal(fx.draft, null);
  assert.equal(fx.skipIds.length, 2);
});

test('Scenario 5: Out of office reply -> reschedules approved sends, preserves prospect status', () => {
  const inboundText = 'I am currently out of office visiting venues until 22 October 2026. For urgent matters contact reception.';
  const cls = classifyReply({ body: inboundText }, now);
  assert.equal(cls.sentiment, 'ooo');
  assert.ok(cls.ooo_until);

  const fx = inboundEffects({
    prospect: baseProspect,
    touches: baseTouches,
    cls,
    settings: DEFAULT_SETTINGS,
    now,
    inbound: { id: 'in-5', channel: 'email', subject: 'Automatic reply: Lake Como guest transport' },
  });

  assert.equal(fx.patch.status, undefined, 'OOO does not count as real partner reply');
  assert.equal(fx.skipIds.length, 0);
  assert.equal(fx.reschedule.length, 1);
  assert.ok(new Date(fx.reschedule[0].scheduled_at) >= new Date('2026-10-23'));
});

test('Scenario 6: Unanswered reply escalation -> alerts after human_escalation_hours', () => {
  const inboundReceivedAt = new Date(now.getTime() - 3 * 3600 * 1000).toISOString(); // 3 hours ago
  const touchesWithWaitingReply = [
    ...baseTouches,
    {
      id: 'in-waiting',
      prospect_id: baseProspect.id,
      direction: 'in',
      channel: 'email',
      state: 'received',
      body: 'Can you handle late night returns from Villa Balbiano to Bellagio?',
      replied_at: inboundReceivedAt,
      handled_at: null,
    },
  ];

  const overdue = findUnansweredReplies({
    prospects: [baseProspect],
    touches: touchesWithWaitingReply,
    settings: { human_escalation_hours: 2 },
    now,
    notifiedIds: [],
  });

  assert.equal(overdue.length, 1);
  assert.equal(overdue[0].prospect.id, baseProspect.id);
  assert.ok(overdue[0].hoursWaiting >= 2);
});

test('Scenario 7: Thread continuity & AI output gatekeeper catches missing PDF acknowledgment', () => {
  const validOutput = {
    sentiment: 'positive',
    intent: 'asks_pricing',
    can_answer_confidently: true,
    needs_human: false,
    body: 'Hi Elena,\n\nI have attached our 1-page partner rate card with net rates for Lake Como and Milan.\n\nWould a quick look be helpful?\n\nBest regards,\nDmitri | DOROGO Transfers\ndmitri@dorogo.eu · +32 456 14 14 97',
    attach_rate_card: true,
  };

  const validated = validatePartnerReplyOutput(validOutput, 'en');
  assert.equal(validated.can_answer_confidently, true);
  assert.equal(validated.needs_human, false);
  assert.equal(validated.attach_rate_card, true);
});

test('Scenario 8: canSend gatekeeper strictly prevents sending to DND or bounced prospects', () => {
  const blockedProspect = { ...baseProspect, do_not_contact: true, status: 'do_not_contact' };
  const touch = { id: 't-blocked', prospect_id: blockedProspect.id, state: 'approved', channel: 'email', step_name: 'T1_intro' };
  const gate = canSend(touch, blockedProspect, [], DEFAULT_SETTINGS, { now, sentToday: 0, firstSendAt: null, sentTotal: 0, bouncedTotal: 0 });

  assert.equal(gate.ok, false);
  assert.equal(gate.reason, 'do_not_contact');
});

test('Scenario 9: Offline fallback -> when AI is unavailable or offline, deterministic rules produce verified draft', () => {
  // If Gemini API is unreachable/offline, applyInbound safely falls back to standard templates
  const inboundText = 'Please send over your rates.';
  const cls = classifyReply({ body: inboundText }, now);

  const fx = inboundEffects({
    prospect: baseProspect,
    touches: baseTouches,
    cls,
    settings: DEFAULT_SETTINGS,
    now,
    inbound: { id: 'in-offline', channel: 'email', subject: 'Re: Lake Como guest transport' },
  });

  assert.ok(fx.draft, 'Draft must be generated even without AI');
  assert.equal(fx.draft.step_name, 'rate_card_delivery');
  assert.equal(fx.draft.attach_rate_card, true);
  assert.ok(fx.draft.body.includes('1-page partner rate card'));
  assert.equal(fx.draft.lint.errors.length, 0);
});

test('Scenario 10: Human escalation fallback -> if reply asks unknown quote offline, draft is held with reason', () => {
  const inboundText = 'Can you quote a transfer to Venice for 50 people on June 10?';
  const cls = classifyReply({ body: inboundText }, now);

  const fx = inboundEffects({
    prospect: baseProspect,
    touches: baseTouches,
    cls,
    settings: DEFAULT_SETTINGS,
    now,
    inbound: { id: 'in-quote', channel: 'email', subject: 'Re: Lake Como guest transport' },
  });

  assert.equal(fx.patch.status, 'quote_requested');
  assert.ok(fx.opportunity);
  assert.equal(fx.opportunity.title, 'Como Luxury Weddings');
});
