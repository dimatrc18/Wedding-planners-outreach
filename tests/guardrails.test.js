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

  // Verify DOROGO Executive Email HTML signature (from DOROGO_SIGNATURE_GUIDE.md)
  const html = renderDorogoLuxuryHtmlEmail(d1.body, { fromEmail: 'booking@dorogo.eu' });
  assert.ok(html.includes('https://dorogo.eu/logo-black.png'), 'Includes official drawn black line logo');
  assert.ok(html.includes('https://dorogo.eu/wa-black.png'), 'Includes self-hosted WhatsApp icon');
  assert.ok(html.includes('https://wa.me/32456141497'), 'Includes clickable WhatsApp link without raw phone digits');
  assert.ok(html.includes('https://dorogo.eu/mail-black.png'), 'Includes self-hosted Mail icon');
  assert.ok(html.includes('Milan &bull; Lake Como &bull; Italian Alps'), 'Includes regional line');

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

test('partner rate card CTAs across planner, venue, and hotel drafts do not contain hardcoded year 2026 and partner_reply sanitizes filler', () => {
  const types = ['planner', 'venue', 'concierge_hotel'];
  const langs = ['en', 'it'];
  for (const type of types) {
    for (const language of langs) {
      for (let i = 0; i < 4; i++) {
        const d = buildDraft({
          prospect: {
            id: `p-${type}-${language}-${i}`,
            agency_name: `Studio ${i}`,
            type,
            language,
            location: 'Cernobbio',
            personalization_hook: 'For weddings at Villa Erba, we can take the guest transport workload off your plate.',
          },
          key: 'T1_intro',
        });
        assert.doesNotMatch(d.body, /2026/, `T1_intro for ${type}/${language}/${i} must not include hardcoded year 2026`);
      }
      const rc = buildDraft({
        prospect: { id: `rc-${type}-${language}`, agency_name: 'Studio', type, language },
        key: 'rate_card_delivery',
        threadSubject: 'Guest transport',
      });
      assert.doesNotMatch(rc.body, /2026/, `rate_card_delivery (${language}) must not include hardcoded year 2026`);
    }
  }

  const sanitized = validatePartnerReplyOutput({
    can_answer_confidently: true,
    needs_human: false,
    escalation_reason: null,
    body: `Hi Elena,\n\nCertainly, our V-Class — with seamless radar tracking! — is €320 net from Malpensa to Bellagio.\n\n${SIGNATURE}`,
    attach_rate_card: true,
  });
  assert.equal(sanitized.can_answer_confidently, true);
  assert.equal(sanitized.needs_human, false);
  assert.deepEqual(sanitized.lint.errors, []);
  assert.deepEqual(sanitized.lint.warnings, []);
  assert.match(sanitized.body, /Mercedes-Benz V-Class/);
  assert.doesNotMatch(sanitized.body, /—|!|\bCertainly\b|\bseamless\b/i);
});

test('MECE overhaul: Variant A (Intro), Variant B (Late returns), Variant C (Hotels/Venues), and Balbianello accuracy', async () => {
  const { buildVerifiedFallbackHook } = await import('../supabase/functions/_shared/core/index.js');

  const planner = {
    id: 'planner-test-1',
    agency_name: 'The Lake Como Wedding Planner',
    contact_name: 'Aimee',
    type: 'planner',
    language: 'en',
    location: 'Tremezzina',
    key_venues: ['Villa del Balbianello', 'Villa Sola Cabiati'],
  };

  // Variant A: Introduction & Observation
  const hookA = buildVerifiedFallbackHook(planner, null, 'A');
  assert.match(hookA, /I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan/i);
  assert.doesNotMatch(hookA, /Balbianello.*(narrow|gate|coach)/i);
  const draftA = buildDraft({
    prospect: { ...planner, personalization_hook: hookA },
    key: 'T1_intro',
    extraVars: { variant: 'A', hook: hookA },
  });
  assert.equal(draftA.variant, 'A');
  assert.doesNotMatch(draftA.subject, /·/, 'Subject line must not contain the template · separator');
  assert.match(draftA.body, /Would it be useful if I sent our rates\?/);
  assert.doesNotMatch(draftA.body, /5% commission|net rates/i, 'Email 1 must not push commercial commission/net rates');
  assert.match(draftA.body, /\+32 456 141 497/);
  assert.match(draftA.body, /If transport isn't something you handle, no problem at all, just let me know\./);
  assert.deepEqual(draftA.lint.errors, []);
  assert.deepEqual(draftA.lint.warnings, []);

  // Variant B: Late Returns After the Reception
  const hookB = buildVerifiedFallbackHook(planner, null, 'B');
  assert.match(hookB, /The hardest part of a Lake Como wedding's transport is often the end of the night/i);
  const draftB = buildDraft({
    prospect: { ...planner, personalization_hook: hookB },
    key: 'T1_intro',
    extraVars: { variant: 'B', hook: hookB },
  });
  assert.equal(draftB.variant, 'B');
  assert.equal(draftB.subject, 'Late returns after the reception');
  assert.match(draftB.body, /I'm Dmitri from DOROGO, and that's the part we cover across Lake Como and Milan/);
  assert.match(draftB.body, /If you ever need an extra hand on a busy date, would it be useful if I sent our rates\?/);
  assert.deepEqual(draftB.lint.errors, []);
  assert.deepEqual(draftB.lint.warnings, []);

  // Variant C: Hotels, Concierges & Venues
  const hotel = {
    id: 'hotel-test-1',
    agency_name: 'Grand Hotel Tremezzo Events & Concierge',
    contact_name: '',
    type: 'concierge_hotel',
    language: 'en',
    location: 'Tremezzina',
    key_venues: ['Grand Hotel Tremezzo', 'Villa Sola Cabiati'],
  };
  const hookC = buildVerifiedFallbackHook(hotel, null, 'A');
  const draftC = buildDraft({
    prospect: { ...hotel, personalization_hook: hookC },
    key: 'T1_intro',
    extraVars: { variant: 'A', hook: hookC },
  });
  assert.equal(draftC.subject, 'Guest transfers for your events team');
  assert.match(draftC.body, /^Hello,/);
  assert.match(draftC.body, /Would it be useful if I sent our vehicle list and partner rates for your team to keep on file\?/);
  assert.deepEqual(draftC.lint.errors, []);
  assert.deepEqual(draftC.lint.warnings, []);
});


