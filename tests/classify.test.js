import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyReply, stripQuoted, parseLooseDate } from '../supabase/functions/_shared/core/index.js';

const now = new Date('2026-10-07T09:00:00Z');
const c = (body, extra = {}) => classifyReply({ from: 'giulia@studio.it', subject: 'Re: Guest transport', body, ...extra }, now);

const SAMPLES = [
  ['Yes please, send it over.', 'positive', 'wants_rate_card'],
  ['Sure, feel free to send the rate card. Thanks Dmitri', 'positive', 'wants_rate_card'],
  ['Sì, mandatemi pure la tariffa, grazie.', 'positive', 'wants_rate_card'],
  ['Volentieri, inviatemi la tariffa.', 'positive', 'wants_rate_card'],
  ['What are your prices from Malpensa to Bellagio for 40 guests?', 'positive', 'asks_pricing'],
  ['Buongiorno, quanto costa un transfer da Linate a Cernobbio?', 'positive', 'asks_pricing'],
  ['Could we schedule a call next week? Tuesday works for me.', 'positive', 'meeting_request'],
  ['Thanks, but we already work with a trusted transport company.', 'negative', 'has_supplier'],
  ['Grazie, abbiamo già un fornitore per i transfer.', 'negative', 'has_supplier'],
  ['We already have a supplier, but happy to have a look at your rate card for our files.', 'positive', 'wants_rate_card'],
  ["We're in the middle of the season, please write again in January.", 'neutral', 'not_now'],
  ['Not right now, maybe next season.', 'neutral', 'not_now'],
  ['Ci sentiamo la prossima stagione, ora siamo pienissimi.', 'neutral', 'not_now'],
  ['Please contact my colleague Giulia, she handles our logistics.', 'neutral', 'referral_to_other'],
  ['Not interested.', 'negative', null],
  ['Please remove me from your list.', 'unsubscribe', null],
  ['No', 'unsubscribe', null],
  ['No thanks.', 'unsubscribe', null],
  ['Non scriveteci più, grazie.', 'unsubscribe', null],
];

test('sample replies are classified as expected', () => {
  for (const [body, sentiment, intent] of SAMPLES) {
    const r = c(body);
    assert.equal(r.sentiment, sentiment, `sentiment for: ${body} → ${JSON.stringify(r)}`);
    assert.equal(r.intent, intent, `intent for: ${body} → ${JSON.stringify(r)}`);
  }
});

test('out-of-office replies carry a resume date and are not counted as replies', () => {
  const r = c('I am out of the office until 20 October with limited access to email.');
  assert.equal(r.sentiment, 'ooo');
  assert.equal(r.ooo_until.slice(0, 10), '2026-10-21');
  const it = c('Risposta automatica: sarò in ferie fino al 15/11.', { subject: 'Risposta automatica' });
  assert.equal(it.sentiment, 'ooo');
  assert.equal(it.ooo_until.slice(0, 10), '2026-11-16');
  const noDate = c('Auto-reply: I am travelling this week.');
  assert.equal(noDate.sentiment, 'ooo');
  assert.equal(noDate.ooo_until.slice(0, 10), '2026-10-14', 'defaults to one week');
});

test('bounces are detected and split hard/soft', () => {
  const hard = classifyReply({ from: 'MAILER-DAEMON@mx.google.com', subject: 'Delivery Status Notification (Failure)', body: 'Address not found' }, now);
  assert.equal(hard.bounce, true);
  assert.equal(hard.hard_bounce, true);
  const soft = classifyReply({ from: 'postmaster@x.it', subject: 'Undeliverable: hello', body: 'Mailbox full, try again later' }, now);
  assert.equal(soft.hard_bounce, false);
});

test('quoted history is ignored', () => {
  const body = 'Thanks Dmitri.\n\nOn Tue, 6 Oct 2026 at 10:00, Dmitri <booking@dorogo.eu> wrote:\n> May I send our 1-page rate card?\n> Yes please send';
  assert.equal(stripQuoted(body), 'Thanks Dmitri.');
  assert.equal(c(body).intent, null);
});

test('not-now replies that name a month get a nurture date', () => {
  assert.equal(c("We're in the middle of the season, please write again in January.").nurture_until.slice(0, 10), '2027-01-01');
});

test('loose dates', () => {
  assert.equal(parseLooseDate('October 20th', now).toISOString().slice(0, 10), '2026-10-20');
  assert.equal(parseLooseDate('12 ottobre 2027', now).toISOString().slice(0, 10), '2027-10-12');
  assert.equal(parseLooseDate('3.1.', now).toISOString().slice(0, 10), '2027-01-03', 'past date rolls to next year');
});

test('challenging operational questions without pricing/rate-card keywords classify as specific_question', () => {
  const q1 = c('How does your dispatcher handle boat pier delays at Villa del Balbianello when it rains?');
  assert.equal(q1.intent, 'specific_question');
  assert.equal(q1.sentiment, 'neutral');
  assert.equal(q1.confidence, 'medium');

  const q2 = c('My couples would never want SumUp links sent to their guests. How does your portal handle privacy under GDPR?');
  assert.equal(q2.intent, 'specific_question');
});

