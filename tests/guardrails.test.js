import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STEPS,
  buildDraft,
  renderDorogoLuxuryHtmlEmail,
  lintMessage,
  validateHookOutput,
  validateClassifyOutput,
  validateDraftOutput,
  validatePartnerReplyOutput,
  findUnansweredReplies,
  SIGNATURE,
} from '../supabase/functions/_shared/core/index.js';

test('2+1 thread split: T1 and T3 are in the same thread, T4 breakup starts a separate fresh thread', () => {
  const t1Step = DEFAULT_STEPS.find((s) => s.key === 'T1_intro');
  const t3Step = DEFAULT_STEPS.find((s) => s.key === 'T3_followup');
  const t4Step = DEFAULT_STEPS.find((s) => s.key === 'T4_breakup');

  assert.equal(t1Step.thread, false, 'T1 starts Thread #1');
  assert.equal(t3Step.thread, true, 'T3 replies inside Thread #1');
  assert.equal(t4Step.thread, false, 'T4 starts a fresh Thread #2');

  const prospect = {
    id: 'p-como-1',
    agency_name: 'Villa Lario Events',
    contact_name: 'Elena',
    language: 'en',
    personalization_hook: 'Your September celebration at Villa Balbiano was paced with real care.',
  };

  const d1 = buildDraft({ prospect, key: 'T1_intro', step: t1Step });
  const d3 = buildDraft({ prospect, key: 'T3_followup', threadSubject: d1.subject, step: t3Step });
  const d4 = buildDraft({ prospect, key: 'T4_breakup', threadSubject: d1.subject, step: t4Step });

  assert.equal(d3.subject, `Re: ${d1.subject}`, 'T3 keeps Re: subject from T1');
  assert.ok(!d4.subject.startsWith('Re:'), 'T4 uses its own fresh subject line, not Re:');
  assert.ok(d4.subject.includes('Villa Lario Events'), 'T4 merges {{agency}} into its fresh subject');
  assert.deepEqual(d4.lint.errors, []);

  // Verify DOROGO Executive Email HTML template (Design 1 from dorogo-ai-concierge)
  const html = renderDorogoLuxuryHtmlEmail(d1.body, { fromEmail: 'booking@dorogo.eu' });
  assert.ok(html.includes('DOROGO &bull; Private Transportation'), 'Includes DOROGO executive dispatch footer');
  assert.ok(html.includes('Milan &bull; Lake Como &bull; Italian Alps'), 'Includes regional line');
  assert.ok(html.includes('+32 456 14 14 97'), 'Includes direct dispatch phone');

  // Verify Concierge no-em-dash lint rule
  const dashLint = lintMessage({ subject: 'Transfer', body: `Hi Elena,\n\nWe run Mercedes-Benz V-Class — always on standby.\n\n${SIGNATURE}`, channel: 'email' });
  assert.ok(dashLint.warnings.some((w) => w.includes('em-dashes')), 'Flags em-dashes per Concierge writing rules');
});

test('validateHookOutput enforces verbatim page evidence, filters hallucinated venues, and sanitizes contact names', () => {
  const pageText = `Atelier Lario plans destination weddings at Villa Balbiano and Villa d'Este on Lake Como.`;

  const valid = validateHookOutput(
    {
      hook: "Your destination weddings at Villa Balbiano and Villa d'Este on Lake Como caught our eye.",
      hook_type: 'venue',
      confidence: 'high',
      evidence: "destination weddings at Villa Balbiano and Villa d'Este on Lake Como",
      language_detected: 'en',
      segment_guess: 'international',
      weddings_per_year_guess: 18,
      key_venues: ['Villa Balbiano', 'Hallucinated Castle'],
      contact_name: 'Info',
    },
    pageText,
  );

  assert.equal(valid.confidence, 'high');
  assert.equal(valid.evidence_found, true);
  assert.equal(valid.needs_review, false);
  assert.deepEqual(valid.key_venues, ['Villa Balbiano'], 'Hallucinated venue not in pageText is stripped');
  assert.equal(valid.contact_name, null, 'Generic contact_name "Info" is stripped');

  const hallucinatedEvidence = validateHookOutput(
    {
      hook: 'Your wedding at Villa Erba was featured in Vogue.',
      hook_type: 'press',
      confidence: 'high',
      evidence: 'featured in Vogue at Villa Erba',
    },
    pageText,
  );
  assert.equal(hallucinatedEvidence.confidence, 'low');
  assert.equal(hallucinatedEvidence.evidence_found, false);
  assert.equal(hallucinatedEvidence.needs_review, true);
});

test('validateClassifyOutput and validateDraftOutput reject malformed or off-brand AI outputs', () => {
  assert.throws(() => validateClassifyOutput({ sentiment: 'excited' }), /invalid sentiment/);

  const cls = validateClassifyOutput({
    sentiment: 'positive',
    intent: 'specific_question',
    wedding_date: '2026-09-19',
    summary: 'Asks if we also have 50-seat coaches for daytime church transfers.',
    needs_human: true,
  });
  assert.equal(cls.sentiment, 'positive');
  assert.equal(cls.intent, 'specific_question');
  assert.equal(cls.wedding_date, '2026-09-19');
  assert.equal(cls.needs_human, true);

  assert.throws(
    () => validateDraftOutput({ subject: 'Hi', body: 'I hope this email finds you well.\n\nDmitri' }),
    /banned phrase/i,
  );
});

test('validatePartnerReplyOutput escalates to human when confidence is low or lint fails', () => {
  const confident = validatePartnerReplyOutput({
    can_answer_confidently: true,
    needs_human: false,
    escalation_reason: null,
    body: `Hi Elena,\n\nA Mercedes-Benz V-Class from Malpensa to Bellagio is €320 net, and our late-night villa shuttle is €450 flat net from midnight to 4 am.\n\n${SIGNATURE}`,
    attach_rate_card: false,
  });
  assert.equal(confident.can_answer_confidently, true);
  assert.equal(confident.needs_human, false);

  const customCoachQuestion = validatePartnerReplyOutput({
    can_answer_confidently: false,
    needs_human: true,
    escalation_reason: 'Planner asked for 50-seat coach pricing not on the rate card',
    body: `Hi Elena,\n\nThank you for the details on the September date. I am checking availability and partner pricing for the 50-seat coach alongside our Mercedes-Benz V-Class fleet and will confirm shortly.\n\n${SIGNATURE}`,
    attach_rate_card: false,
  });
  assert.equal(customCoachQuestion.needs_human, true);
  assert.match(customCoachQuestion.escalation_reason, /50-seat coach/);
});

test('findUnansweredReplies flags real replies waiting longer than human_escalation_hours', () => {
  const now = new Date('2026-10-07T14:00:00Z');
  const prospects = [
    { id: 'p1', agency_name: 'Como Chic Weddings', email: 'elena@comochic.it' },
    { id: 'p2', agency_name: 'Answered Studio', email: 'marco@answered.it' },
  ];
  const touches = [
    // Unanswered real reply from 3 hours ago -> should escalate (threshold = 2h)
    {
      id: 'in-1',
      prospect_id: 'p1',
      direction: 'in',
      channel: 'email',
      reply_sentiment: 'positive',
      replied_at: '2026-10-07T10:30:00Z',
      body: 'Thanks Dmitri! Do you also cover transfers from Bergamo airport for 40 guests?',
      classification: { needs_human: true, escalation_reason: 'Asked about Bergamo airport for 40 guests' },
    },
    // Answered reply -> should NOT escalate
    {
      id: 'in-2',
      prospect_id: 'p2',
      direction: 'in',
      channel: 'email',
      reply_sentiment: 'positive',
      replied_at: '2026-10-07T09:00:00Z',
      body: 'Please send the rate card.',
    },
    {
      id: 'out-2',
      prospect_id: 'p2',
      direction: 'out',
      channel: 'email',
      state: 'sent',
      sent_at: '2026-10-07T09:10:00Z',
      body: 'Here is the rate card.',
    },
  ];

  const overdue = findUnansweredReplies({
    prospects,
    touches,
    settings: { human_escalation_hours: 2 },
    now,
    notifiedIds: [],
  });

  assert.equal(overdue.length, 1);
  assert.equal(overdue[0].prospect.agency_name, 'Como Chic Weddings');
  assert.equal(overdue[0].hoursWaiting, 3.5);
  assert.match(overdue[0].needsHumanReason, /Bergamo/);

  // Once notified, it is not returned again
  const secondPass = findUnansweredReplies({
    prospects,
    touches,
    settings: { human_escalation_hours: 2 },
    now,
    notifiedIds: ['in-1'],
  });
  assert.equal(secondPass.length, 0);
});
