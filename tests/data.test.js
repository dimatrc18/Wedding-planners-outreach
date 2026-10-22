import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  wilson, computeMetrics, tractionVerdict, compareRates, csvToProspects, toCSV, findDuplicates, extractFromHtml,
  priorityScore, parseProfileUrl, quoteNet, commissionFor, getRateCardInfo, rankUsableEmails, inferLanguage,
  sanitizeCatalogProspect, DISCOVERY_PARTNER_CATALOG, buildSocialOpener, resolveProspectResearchSeed, isParkedOrDeadDomain,
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

test('priorityScore differentiates named planners, generic hotel info desks, missing emails, and invalid emails', () => {
  const namedPlanner = priorityScore({
    type: 'planner',
    contact_name: 'Jane Riddell',
    email: 'jane@plannedforperfection.co.uk',
    email_status: 'mx_ok',
    website: 'https://plannedforperfection.co.uk',
    market: 'uk',
    location: 'London & Lake Como',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', "Villa d'Este"],
    rating: 5.0,
    verified_reviews_count: 54,
    personalization_hook: 'I came across your bespoke weddings on Lake Como and wanted to introduce ourselves directly.',
  }).score;

  const genericHotelDesk = priorityScore({
    type: 'venue',
    contact_name: '',
    email: 'info@relaisvillavittoria.it',
    email_status: 'mx_ok',
    website: 'https://www.relaisvillavittoria.com',
    market: 'it',
    location: 'Laglio',
    key_venues: ['Relais Villa Vittoria'],
    rating: 4.8,
    verified_reviews_count: 180,
    personalization_hook: "I'm Dmitri from DOROGO, a private transport company covering Lake Como and Milan.",
  }).score;

  const noEmailProspect = priorityScore({
    type: 'planner',
    contact_name: 'WP Bellagio',
    email: null,
    website: 'https://www.wpbellagio.com',
    market: 'it',
    location: 'Bellagio',
    key_venues: ['Villa Serbelloni'],
    rating: 4.9,
    verified_reviews_count: 12,
    personalization_hook: 'Ho visto i vostri matrimoni a Bellagio.',
  }).score;

  const invalidEmailProspect = priorityScore({
    type: 'planner',
    contact_name: 'Michelle Rago',
    email: 'info@michellerago.com',
    email_status: 'invalid',
    website: 'https://michellerago.com',
    market: 'us',
    location: 'New York & Lake Como',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa Pizzo'],
    rating: 5.0,
    verified_reviews_count: 42,
    personalization_hook: 'I came across your luxury private estate celebrations on Lake Como.',
  }).score;

  assert.ok(namedPlanner >= 95, `namedPlanner should be >= 95, got ${namedPlanner}`);
  assert.ok(genericHotelDesk >= 70 && genericHotelDesk < 90, `genericHotelDesk should be 70..89, got ${genericHotelDesk}`);
  assert.ok(namedPlanner > genericHotelDesk, 'named planner must outrank generic hotel info@ desk');
  assert.ok(noEmailProspect < 65, `prospect without email must score below 65 gate, got ${noEmailProspect}`);
  assert.ok(invalidEmailProspect <= 35, `invalid email prospect must be capped <= 35, got ${invalidEmailProspect}`);
});

test('rankUsableEmails prioritizes founder inboxes for planners and events/concierge desks for hotels', () => {
  const plannerRanked = rankUsableEmails(
    ['privacy@studio.it', 'reservations@studio.it', 'info@studio.it', 'hello@studio.it', 'sarah@studio.it', 'vendors@studio.it'],
    'https://www.studio.it',
    'planner',
  );
  assert.equal(plannerRanked[0], 'vendors@studio.it');
  assert.equal(plannerRanked[1], 'sarah@studio.it');
  assert.equal(plannerRanked[2], 'hello@studio.it');
  assert.equal(plannerRanked[3], 'info@studio.it');
  assert.ok(!plannerRanked.includes('privacy@studio.it'));

  const hotelRanked = rankUsableEmails(
    ['reservations@villadeste.it', 'info@villadeste.it', 'events@villadeste.it', 'press@villadeste.it'],
    'https://www.villadeste.it',
    'concierge_hotel',
  );
  assert.equal(hotelRanked[0], 'events@villadeste.it');
  assert.ok(!hotelRanked.includes('press@villadeste.it'));
});

test('inferLanguage routes RU, IT, and EN accurately even when Italian sites use English HTML tags', () => {
  assert.equal(inferLanguage({ website: 'https://dlyadvoih.ru', location: 'Moscow' }, 'en'), 'ru');
  assert.equal(inferLanguage({ website: 'https://www.sposiamovi.it', location: 'Milan' }, 'en'), 'it');
  assert.equal(inferLanguage({ website: 'https://www.plannedforperfection.co.uk', location: 'London' }, 'en'), 'en');
  assert.equal(inferLanguage({ website: 'https://katrinmoroweddings.com', language: 'ru', location: 'Rome' }, 'en'), 'ru');
});

test('sanitizeCatalogProspect strips alt_email and country into enrichment JSONB and catalog has 35+ verified partners', () => {
  const raw = { agency_name: 'Katrin Moro Weddings', email: 'katrinmorostar@gmail.com', alt_email: 'katrinmoroweddings@gmail.com', country: 'IT' };
  const clean = sanitizeCatalogProspect(raw);
  assert.equal('alt_email' in clean, false);
  assert.equal('country' in clean, false);
  assert.equal(clean.enrichment.alt_email, 'katrinmoroweddings@gmail.com');
  assert.equal(clean.enrichment.country, 'IT');
  assert.ok(DISCOVERY_PARTNER_CATALOG.length >= 35, `Expected >= 35 catalog partners, got ${DISCOVERY_PARTNER_CATALOG.length}`);
  assert.equal(DISCOVERY_PARTNER_CATALOG.some((c) => c.email === 'info@michellerago.com'), false, 'Michelle Rago dangling MX must not be in catalog');
});

test('rate card quote and commission', () => {
  const q = quoteNet([{ kind: 'route', route: 'mxp_bellagio', vehicle: 'V', qty: 4 }, { kind: 'shuttle', qty: 2 }, { kind: 'hourly', vehicle: 'S', hours: 2, qty: 1 }]);
  assert.equal(q.total, 4 * 320 + 2 * 450 + 3 * 110);
  assert.equal(q.deposit, Math.round(q.total * 0.25));
  assert.equal(commissionFor(10000, 'referral_12'), 1000);
  assert.equal(commissionFor(10000, 'net_whitelabel'), 0);
});

test('buildSocialOpener produces multi-channel openers for Instagram and WhatsApp across EN, IT, RU', () => {
  const enProspect = { contact_name: 'Rachel Birthistle', agency_name: 'The Lake Como Wedding Planner', language: 'en' };
  const igEn = buildSocialOpener(enProspect, 'instagram');
  assert.match(igEn, /Rachel/);
  assert.match(igEn, /backup slots/);
  assert.match(igEn, /2027 partner rate card/);

  const waEn = buildSocialOpener(enProspect, 'whatsapp');
  assert.match(waEn, /Rachel/);
  assert.match(waEn, /vetted backup fleet/);

  const itProspect = { contact_name: 'Elena Pennisi', agency_name: 'Elena Pennisi Events', language: 'it' };
  const igIt = buildSocialOpener(itProspect, 'instagram');
  assert.match(igIt, /Elena/);
  assert.match(igIt, /backup/i);

  const ruProspect = { contact_name: 'Катрин Моро', agency_name: 'Katrin Moro Weddings', language: 'ru' };
  const waRu = buildSocialOpener(ruProspect, 'whatsapp');
  assert.match(waRu, /Катрин/);
  assert.match(waRu, /резерв/);
});

test('multi-language rate card routing matches communication language (EN, IT, RU)', () => {
  // Default routing
  const enDefault = getRateCardInfo({}, 'en');
  assert.equal(enDefault.filename, 'DOROGO_Tariffs_Logistics_EN.pdf');
  assert.equal(enDefault.path, 'rate-card/DOROGO_Tariffs_Logistics_EN.pdf');

  const itDefault = getRateCardInfo({}, 'it');
  assert.equal(itDefault.filename, 'DOROGO_Tariffs_Logistics_IT.pdf');
  assert.equal(itDefault.path, 'rate-card/DOROGO_Tariffs_Logistics_IT.pdf');

  const ruDefault = getRateCardInfo({}, 'ru');
  assert.equal(ruDefault.filename, 'DOROGO_Tariffs_Logistics_RU.pdf');
  assert.equal(ruDefault.path, 'rate-card/DOROGO_Tariffs_Logistics_RU.pdf');

  // Case-insensitivity & dialect prefix
  assert.equal(getRateCardInfo({}, 'IT-it').filename, 'DOROGO_Tariffs_Logistics_IT.pdf');
  assert.equal(getRateCardInfo({}, 'ru_RU').filename, 'DOROGO_Tariffs_Logistics_RU.pdf');
  assert.equal(getRateCardInfo({}, '').filename, 'DOROGO_Tariffs_Logistics_EN.pdf');

  // Custom setting overrides
  const custom = getRateCardInfo({
    rate_card_path_it: 'custom/italian_card.pdf',
    rate_card_filename_it: 'Custom_Italian_Card.pdf',
  }, 'it');
  assert.equal(custom.path, 'custom/italian_card.pdf');
  assert.equal(custom.filename, 'Custom_Italian_Card.pdf');
});

test('resolveProspectResearchSeed never hallucinates or guesses unverified domains', () => {
  // Unknown agencies must NOT synthesize arbitrary www.<agency>.com domains
  const seedUnknown = resolveProspectResearchSeed({ agency_name: 'WP Bellagio' });
  assert.equal(seedUnknown.website, '');
  assert.equal(seedUnknown.guessedUrl, '');

  const seedRandom = resolveProspectResearchSeed({ agency_name: 'Random Unknown Planner' });
  assert.equal(seedRandom.website, '');
  assert.equal(seedRandom.guessedUrl, '');

  // Known directory entries return their verified website
  const seedKnown = resolveProspectResearchSeed({ agency_name: 'Federica Cantù' });
  assert.equal(seedKnown.website, 'https://www.federicacantuweddingplanner.com');
  assert.equal(seedKnown.email, 'hello@federicacantuweddingplanner.com');

  // Existing prospect website is preserved
  const seedExisting = resolveProspectResearchSeed({ agency_name: 'Custom', website: 'https://customplanner.it' });
  assert.equal(seedExisting.website, 'https://customplanner.it');
});

test('isParkedOrDeadDomain detects parked landers, expired pages, and domain brokers', () => {
  // Path & query parked lander detection
  assert.ok(isParkedOrDeadDomain('https://michellerago.com/lander?oref=https%3A%2F%2Fdimatrc18.github.io%2F'));
  assert.ok(isParkedOrDeadDomain('https://example.com/lander'));
  assert.ok(isParkedOrDeadDomain('https://someplanner.com/parking/'));
  assert.ok(isParkedOrDeadDomain('https://sedo.com/search/details/?domain=example.com'));
  assert.ok(isParkedOrDeadDomain('https://dan.com/buy-domain/weddingplanner.com'));
  assert.ok(isParkedOrDeadDomain('https://www.hugedomains.com/domain_profile.cfm?d=planner.com'));

  // HTML content signatures (GoDaddy parking, lander systems, broker ads)
  const godaddyLanderHtml = '<!doctype html><html><head><script>window.LANDER_SYSTEM="PW"</script><script>window._trfd=window._trfd||[],window._trfd.push({ap:"parking"})</script><script src="https://img1.wsimg.com/parking-lander/static/js/main.js"></script></head><body></body></html>';
  assert.ok(isParkedOrDeadDomain('https://michellerago.com', godaddyLanderHtml));

  const forSaleHtml = '<html><body><h1>This domain is for sale</h1><p>Inquire about this domain at Afternic</p></body></html>';
  assert.ok(isParkedOrDeadDomain('https://dormantwedding.com', forSaleHtml));

  const expiredHtml = '<html><body><h1>This domain has expired</h1><p>Renew your domain now.</p></body></html>';
  assert.ok(isParkedOrDeadDomain('https://expiredagency.com', expiredHtml));

  // Legitimate active wedding planner sites must NOT be flagged
  assert.ok(!isParkedOrDeadDomain('https://www.eastonevents.com'));
  assert.ok(!isParkedOrDeadDomain('https://passalacqua.it'));
  assert.ok(!isParkedOrDeadDomain('https://www.villadeste.com'));

  const validHtml = '<html><head><title>Easton Events | Destination Weddings</title></head><body><h1>Luxury Destination Weddings in Italy</h1><p>Contact easton@eastonevents.com</p></body></html>';
  assert.ok(!isParkedOrDeadDomain('https://www.eastonevents.com', validHtml));
});

test('DISCOVERY_PARTNER_CATALOG contains verified Easton email and zero dead/parked domains', () => {
  const easton = DISCOVERY_PARTNER_CATALOG.find((p) => p.agency_name === 'Easton Events');
  assert.ok(easton, 'Easton Events must exist in catalog');
  assert.equal(easton.email, 'easton@eastonevents.com', 'Easton email must match contact page (easton@eastonevents.com)');
  assert.notEqual(easton.email, 'info@eastonevents.com', 'Old bounced info@eastonevents.com must be removed');

  const sinclair = DISCOVERY_PARTNER_CATALOG.find((p) => p.agency_name === 'Sinclair Events');
  assert.equal(sinclair, undefined, 'Sinclair Events (dead/bounced) must not be in catalog');

  const bellagio = DISCOVERY_PARTNER_CATALOG.find((p) => /wpbellagio/i.test(p.website || ''));
  assert.equal(bellagio, undefined, 'wpbellagio.com must not be in catalog');

  const mandarin = DISCOVERY_PARTNER_CATALOG.find((p) => /Mandarin/i.test(p.agency_name));
  assert.ok(mandarin, 'Mandarin Oriental must exist in catalog');
  assert.equal(mandarin.email, 'mocmo-reservations@mohg.com', 'Mandarin Oriental email must be live published mocmo-reservations@mohg.com');
  assert.notEqual(mandarin.email, 'molco-events@mohg.com', 'Bounced molco-events@mohg.com must be removed from catalog');

  for (const partner of DISCOVERY_PARTNER_CATALOG) {
    if (partner.website) {
      assert.ok(!isParkedOrDeadDomain(partner.website), `Catalog partner "${partner.agency_name}" has parked/dead domain: ${partner.website}`);
    }
  }
});
