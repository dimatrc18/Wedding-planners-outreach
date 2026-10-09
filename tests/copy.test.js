import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintMessage, buildDraft, DEFAULT_TEMPLATES, merge, buildVars, assignVariant, greeting } from '../supabase/functions/_shared/core/index.js';

const prospect = {
  id: 'abc', agency_name: 'WP Bellagio', contact_name: 'Giulia Rossi', language: 'en',
  personalization_hook: 'Your September wedding at Villa Melzi, with the boat arrival at dusk, was beautifully paced.',
};

test('every default template passes the linter once its blanks are filled', () => {
  for (const t of DEFAULT_TEMPLATES) {
    const vars = buildVars({ ...prospect, language: t.language }, { slot_1: 'Tuesday at 10:00', slot_2: 'Wednesday at 15:00', referred_name: 'Marco', your_reply: 'Noted.' });
    const subject = t.subject_a ? merge(t.subject_a, vars) : 'Re: Guest transport for your Lake Como weddings';
    const channel = 'email';
    const r = lintMessage({ subject, body: merge(t.body, vars), channel, step: t.key });
    assert.deepEqual(r.errors, [], `${t.key}/${t.language}: ${r.errors.join('; ')}`);
    if (t.subject_b) assert.deepEqual(lintMessage({ subject: merge(t.subject_b, vars), body: merge(t.body, vars), channel, step: t.key }).errors, []);
    if (t.key === 'T1_intro') assert.ok(r.words <= 120, `T1 ${t.language} is ${r.words} words`);
  }
});

test('banned phrases are errors', () => {
  const base = { subject: 'Hello', channel: 'email', step: 'T3_followup' };
  for (const phrase of ['I hope this email finds you well.', 'Absolutely, we can.', 'Please do not hesitate to contact us.', 'Rest assured, we will be there.',
    'We strive to provide seamless service.', 'Elevate your journey.', 'We would be delighted to assist.', 'Great question!', 'Thank you for reaching out.']) {
    assert.ok(lintMessage({ ...base, body: `${phrase}\n\nDmitri` }).errors.some((e) => e.startsWith('Banned')), phrase);
  }
});

test('empty hook and other blanks block approval', () => {
  const d = buildDraft({ prospect: { ...prospect, personalization_hook: '' }, key: 'T1_intro' });
  assert.ok(d.lint.errors.some((e) => e.includes('hook')));
  const r = lintMessage({ subject: 'x', body: 'Free on {{slot_1}}?\nDmitri', channel: 'email', step: 'custom' });
  assert.ok(r.errors.includes('Fill in {{slot_1}}'));
});

test('vehicle terms and length limits', () => {
  assert.ok(lintMessage({ subject: 's', body: 'Our V-Class 4MATIC Extra-Long.\nDmitri', channel: 'email' }).warnings.length >= 3);
  const longWa = Array(45).fill('word').join(' ');
  assert.ok(lintMessage({ body: longWa, channel: 'whatsapp' }).warnings.some((w) => w.includes('Message')));
  assert.ok(lintMessage({ body: Array(70).fill('word').join(' '), channel: 'whatsapp' }).errors.some((w) => w.includes('Message')));
  const longT1 = `${Array(130).fill('word').join(' ')}?\nDmitri reply "no"`;
  assert.ok(lintMessage({ subject: 's', body: longT1, channel: 'email', step: 'T1_intro' }).warnings.some((w) => w.includes('words')));
});

test('T1 must ask one or two focused questions and not push for a call', () => {
  const r = lintMessage({ subject: 's', body: 'How do you do transport? Shall we book a call? Can I send the card?\nDmitri reply "no"', channel: 'email', step: 'T1_intro' });
  assert.ok(r.warnings.some((w) => w.includes('questions')));
  assert.ok(r.warnings.some((w) => w.includes('not a call')));
});

test('drafts: greeting, threading, stable A/B variant', () => {
  assert.equal(greeting(prospect), 'Hi Giulia,');
  assert.equal(greeting({ language: 'it', contact_name: '' }), 'Buongiorno,');
  const t1 = buildDraft({ prospect, key: 'T1_intro' });
  assert.deepEqual(t1.lint.errors, []);
  assert.ok(t1.body.includes(prospect.personalization_hook));
  const t3 = buildDraft({ prospect, key: 'T3_followup', threadSubject: t1.subject, step: { thread: true } });
  assert.equal(t3.subject, `Re: ${t1.subject}`);
  const v = assignVariant('abc', { subject_b: 'x' });
  assert.equal(assignVariant('abc', { subject_b: 'x' }), v);
  const split = new Set(Array.from({ length: 40 }, (_, i) => assignVariant(`p${i}`, { subject_b: 'x' })));
  assert.equal(split.size, 2, 'both variants get used');
});
