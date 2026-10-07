import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  wilson, computeMetrics, tractionVerdict, compareRates, csvToProspects, toCSV, findDuplicates, extractFromHtml,
  priorityScore, parseProfileUrl, quoteNet, commissionFor,
} from '../supabase/functions/_shared/core/index.js';

test('Wilson interval', () => {
  assert.equal(wilson(0, 0).p, null);
  const ci = wilson(5, 50);
  assert.ok(Math.abs(ci.lo - 0.0435) < 0.002 && Math.abs(ci.hi - 0.2136) < 0.002, JSON.stringify(ci));
  assert.ok(compareRates({ k: 10, n: 50 }, { k: 2, n: 50 }) < 0.05);
  assert.ok(compareRates({ k: 3, n: 20 }, { k: 2, n: 20 }) > 0.5);
});

const mk = (n, replies, positives) => {
  const prospects = [], touches = [];
  for (let i = 0; i < n; i++) {
    const id = `p${i}`; const sentAt = new Date(Date.UTC(2026, 9, 6, 8, i)).toISOString();
    prospects.push({ id, status: i < positives ? 'replied' : 't1_sent', personalization_hook: 'x' });
    touches.push({ prospect_id: id, direction: 'out', state: 'sent', step_name: 'T1_intro', channel: 'email', sent_at: sentAt, variant: i % 2 ? 'B' : 'A' });
    if (i < replies) touches.push({ prospect_id: id, direction: 'in', channel: 'email', reply_sentiment: i < positives ? 'positive' : 'neutral', replied_at: new Date(Date.UTC(2026, 9, 7, 8, i)).toISOString() });
  }
  return { prospects, touches };
};

test('funnel and rates from touches', () => {
  const { prospects, touches } = mk(20, 5, 3);
  const m = computeMetrics(prospects, touches, [], new Date('2026-10-20'));
  assert.equal(m.contacted, 20);
  assert.equal(m.replied, 5);
  assert.equal(m.positive, 3);
  assert.equal(m.positiveRate.p, 0.15);
  assert.equal(m.funnel[0].count, 20);
  assert.equal(Math.round(m.medianHoursToReply), 24);
});

test('traction verdict is honest about sample size', () => {
  let { prospects, touches } = mk(6, 1, 1);
  let m = computeMetrics(prospects, touches);
  assert.equal(tractionVerdict(m, m.facts).level, 'early');
  ({ prospects, touches } = mk(80, 4, 1));
  m = computeMetrics(prospects, touches);
  const v = tractionVerdict(m, m.facts);
  assert.equal(v.level, 'below');
  assert.match(v.detail, /95% interval/);
  ({ prospects, touches } = mk(60, 20, 15));
  m = computeMetrics(prospects, touches);
  assert.equal(tractionVerdict(m, m.facts).level, 'traction');
  assert.equal(tractionVerdict(computeMetrics([], []), []).level, 'none');
});

test('CSV import maps headers, handles quotes, semicolons and bad emails', () => {
  const csv = 'Agency;Contact;Email;Instagram;Rating;Reviews;Extra\n"Perlee; Lake Como";Anna;anna@perlee.it;https://instagram.com/perlee.weddings/;5,0;26;foo\nSugarEvents;;not-an-email;@sugarevents;4.9;70;';
  const rows = csvToProspects(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].agency_name, 'Perlee; Lake Como');
  assert.equal(rows[0].instagram_handle, 'perlee.weddings');
  assert.equal(rows[0].rating, 5);
  assert.equal(rows[0].verified_reviews_count, 26);
  assert.match(rows[0].notes, /Extra: foo/);
  assert.equal(rows[1].email, undefined, 'invalid email is not imported');
  assert.match(rows[1].notes, /invalid email/);
  assert.match(toCSV(rows, ['agency_name', 'email']), /"Perlee; Lake Como",anna@perlee.it/);
});

test('dedupe by email, domain, Instagram and name', () => {
  const existing = [
    { id: '1', agency_name: 'WP Bellagio', website: 'https://www.wpbellagio.com' },
    { id: '2', agency_name: 'Perlee', instagram_handle: 'perlee.weddings' },
    { id: '3', agency_name: 'Studio X', email: 'info@gmail.com' },
  ];
  assert.equal(findDuplicates({ website: 'wpbellagio.com/contact' }, existing)[0].id, '1');
  assert.equal(findDuplicates({ email: 'hello@wpbellagio.com' }, existing)[0].id, '1');
  assert.equal(findDuplicates({ instagram_handle: '@Perlee.Weddings' }, existing)[0].id, '2');
  assert.equal(findDuplicates({ email: 'other@gmail.com' }, existing).length, 0, 'free-mail domains do not match each other');
  assert.equal(findDuplicates({ agency_name: 'Perlee Weddings' }, existing)[0].id, '2');
});

test('page extraction finds only what is on the page', () => {
  const html = `<html lang="it"><head><title>Studio Lago | Wedding Planner</title><meta name="description" content="Weddings on Lake Como"></head>
  <body><a href="mailto:info&#64;studiolago.it">Write</a> hello [at] studiolago.it <img src="logo@2x.png">
  <a href="https://www.instagram.com/studiolago/">IG</a><a href="https://instagram.com/p/xyz">post</a>
  <a href="tel:+39 031 123456">call</a><p>Our last wedding at Villa Balbiano in Ossuccio, and one in Bellagio.</p>
  <a href="/contatti">Contatti</a><script>var x="noreply@sentry.io"</script></body></html>`;
  const x = extractFromHtml(html, 'https://studiolago.it');
  assert.deepEqual(x.emails.sort(), ['hello@studiolago.it', 'info@studiolago.it']);
  assert.deepEqual(x.instagram, ['studiolago']);
  assert.deepEqual(x.phones, ['+39031123456']);
  assert.equal(x.lang, 'it');
  assert.deepEqual(x.venues, ['Villa Balbiano']);
  assert.ok(x.towns.includes('Bellagio') && x.towns.includes('Ossuccio'));
  assert.ok(x.links.includes('/contatti'));
  assert.deepEqual(parseProfileUrl('https://www.instagram.com/perlee.weddings/'), { instagram_handle: 'perlee.weddings', source: 'instagram' });
});

test('priority: boutique planners with reviews outrank saturated tier-1 agencies', () => {
  const boutique = priorityScore({ type: 'planner', rating: 5, verified_reviews_count: 41, segment: 'boutique_local' }).score;
  const tier1 = priorityScore({ type: 'planner', rating: 5, verified_reviews_count: 41, segment: 'international', tags: ['tier1'] }).score;
  const photographer = priorityScore({ type: 'photographer' }).score;
  assert.ok(boutique > tier1 && boutique > photographer);
});

test('rate card quote and commission', () => {
  const q = quoteNet([{ kind: 'route', route: 'mxp_bellagio', vehicle: 'V', qty: 4 }, { kind: 'shuttle', qty: 2 }, { kind: 'hourly', vehicle: 'S', hours: 2, qty: 1 }]);
  assert.equal(q.total, 4 * 320 + 2 * 450 + 3 * 110);
  assert.equal(q.deposit, Math.round(q.total * 0.25));
  assert.equal(commissionFor(10000, 'referral_12'), 1200);
  assert.equal(commissionFor(10000, 'net_whitelabel'), 0);
});
