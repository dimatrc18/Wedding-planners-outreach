import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyReply, stripQuoted, parseLooseDate, isSystemOrBotSender, detectBounce, extractBounceFailedRecipient } from '../supabase/functions/_shared/core/index.js';

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
  ['Да, пришлите подробную информацию и партнёрские тарифы на V-Class.', 'positive', 'wants_rate_card'],
  ['Сколько стоит трансфер на микроавтобусе из Мальпенсы в Комо?', 'positive', 'asks_pricing'],
  ['Спасибо, сейчас не актуально, напишите в следующем сезоне.', 'neutral', 'not_now'],
  ['У нас уже есть свой транспорт.', 'negative', 'has_supplier'],
  ['Отпишите меня от рассылки.', 'unsubscribe', null],
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

test('extractBounceFailedRecipient extracts failed recipient and ignores sender', () => {
  // Hostinger bounce format (Ksenia Ridolfi case)
  const hostingerBounce = {
    from: 'mailer-daemon@bounce.mail.hostinger.com',
    subject: 'Returned mail: see transcript for details',
    text: `The message was received at Fri, 24 Oct 2026 09:37:55 +0200
from dmitri@dorogo.eu and addressed to info@kseniaridolfi.com.

The following addresses had permanent fatal errors -----
<info@kseniaridolfi.com>
(reason: 551 5.4.7 Next delivery time would be 3days: host mx.kseniaridolfi.com: Host not found)

----- Transcript of session follows -----`,
  };
  assert.equal(extractBounceFailedRecipient(hostingerBounce, 'dmitri@dorogo.eu'), 'info@kseniaridolfi.com');

  // RFC 3464 DSN
  const rfc3464Bounce = {
    from: 'MAILER-DAEMON@relay.example.com',
    subject: 'Delivery Status Notification (Failure)',
    text: `Action: failed\nStatus: 5.1.1\nFinal-Recipient: rfc822; invalid@agency.it\nDiagnostic-Code: 550 User unknown`,
  };
  assert.equal(extractBounceFailedRecipient(rfc3464Bounce, 'dmitri@dorogo.eu'), 'invalid@agency.it');

  // Google Mail Delivery Subsystem
  const googleBounce = {
    from: 'mail-noreply@google.com',
    subject: 'Delivery Status Notification (Failure)',
    text: `** Message not delivered **\nThere was a problem delivering your message to contact@weddingcomo.com. See the technical details below.`,
  };
  assert.equal(extractBounceFailedRecipient(googleBounce, 'dmitri@dorogo.eu'), 'contact@weddingcomo.com');

  // Header x-failed-recipients
  const headerBounce = {
    failedRecipients: 'header-fail@planner.com',
    text: 'Some random text without emails',
  };
  assert.equal(extractBounceFailedRecipient(headerBounce, 'dmitri@dorogo.eu'), 'header-fail@planner.com');

  // Strict sender immunity: if body only contains sender email and mailer-daemon, never return sender!
  const onlySenderBounce = {
    from: 'mailer-daemon@bounce.mail.hostinger.com',
    subject: 'Returned mail',
    text: 'The message was received from dmitri@dorogo.eu. System error.',
  };
  assert.equal(extractBounceFailedRecipient(onlySenderBounce, 'dmitri@dorogo.eu'), '');
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

test('apple mail and automated unsubscribe headers classify as unsubscribe not ooo', () => {
  const appleMail = classifyReply({
    subject: 'unsubscribe',
    body: 'Apple Mail sent this email to unsubscribe from the message “unsubscribe”.',
  }, now);
  assert.equal(appleMail.sentiment, 'unsubscribe');
  assert.equal(appleMail.intent, null);

  const subjectOnly = classifyReply({
    subject: 'unsubscribe',
    body: '',
  }, now);
  assert.equal(subjectOnly.sentiment, 'unsubscribe');
});

test('challenging operational questions without pricing/rate-card keywords classify as specific_question', () => {
  const q1 = c('How does your dispatcher handle boat pier delays at Villa del Balbianello when it rains?');
  assert.equal(q1.intent, 'specific_question');
  assert.equal(q1.sentiment, 'neutral');
  assert.equal(q1.confidence, 'medium');

  const q2 = c('My couples would never want SumUp links sent to their guests. How does your portal handle privacy under GDPR?');
  assert.equal(q2.intent, 'specific_question');
});

test('isSystemOrBotSender blocks vendor and transactional emails from becoming CRM prospects', () => {
  // DeBounce verification & welcome email
  assert.equal(isSystemOrBotSender('info@debounce.email', 'DeBounce', 'Welcome to DeBounce. Verify Your Email Address.'), true);
  // ZeroBounce / MillionVerifier
  assert.equal(isSystemOrBotSender('support@zerobounce.net', 'ZeroBounce Support', 'Your monthly credits'), true);
  assert.equal(isSystemOrBotSender('billing@millionverifier.com', 'MillionVerifier', 'Invoice #12345'), true);
  // Generic automated senders
  assert.equal(isSystemOrBotSender('noreply@service.com', 'Service', 'Account update'), true);
  assert.equal(isSystemOrBotSender('notifications@github.com', 'GitHub', 'Run completed'), true);
  assert.equal(isSystemOrBotSender('mailer-daemon@google.com', 'Google', 'Delivery Status Notification'), true);
  assert.equal(isSystemOrBotSender('any@domain.com', 'Any', 'Password reset requested'), true);
  assert.equal(isSystemOrBotSender('user@auto.com', 'Bot', 'Hello', 'auto-generated'), true);

  // Legitimate wedding planner inbound inquiry
  assert.equal(isSystemOrBotSender('federica@lakecomoweddings.it', 'Federica', 'Guest shuttle inquiry for Villa Balbiano'), false);
  assert.equal(isSystemOrBotSender('contact@elizabeth-events.com', 'Elizabeth', 'Van and minibus rates 2027'), false);
});

