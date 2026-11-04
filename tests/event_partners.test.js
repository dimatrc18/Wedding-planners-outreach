import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { 
  INITIAL_EVENT_PARTNERS, 
  loadStoredEventPartners, 
  saveStoredEventPartners, 
  mergeEventRecords,
  EVENT_AGENCY_TYPES,
  EVENT_FAIRS,
  DEFAULT_EVENT_TEMPLATES,
  renderEventTemplate
} from '../app/event_planners_data.js';
import { EVENT_STATUSES } from '../supabase/functions/_shared/core/constants.js';
import { S, addEventPartner, updateEventPartner, removeEventPartner } from '../app/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Event Outreach Data Integrity: data/event_planners.json loads cleanly with required fields', () => {
  const raw = fs.readFileSync(path.join(rootDir, 'data/event_planners.json'), 'utf8');
  const planners = JSON.parse(raw);

  assert.ok(Array.isArray(planners));
  assert.ok(planners.length >= 7, 'Must have at least 7 verified event agencies');

  for (const p of planners) {
    assert.ok(p.id, 'Every agency must have an ID');
    assert.ok(p.name, 'Agency name is required');
    assert.ok(p.agency_type, 'Agency type is required');
    assert.ok(p.email, `Agency ${p.name} must have contact email`);
    assert.ok(p.website, `Agency ${p.name} must have website`);
    assert.ok(p.base_city, `Agency ${p.name} must have base city`);
    assert.ok(p.relevance_score >= 80, `Relevance score for ${p.name} must be >= 80`);
    assert.ok(p.status, 'Status is required');
  }
});

test('Event Outreach Isolation Principle: CRUD operations NEVER mutate Wedding Planners or Bus Partners', async () => {
  // Capture initial state
  const initialWeddingCount = (S.prospects || []).length;
  const initialBusCount = (S.busPartners || []).length;
  const initialEventCount = (S.eventPartners || []).length;

  // 1. Add new event partner
  const newAgency = await addEventPartner({
    name: 'Test Milan Fashion Events SRL',
    agency_type: 'fashion_luxury',
    email: 'contact@milanfashiontest.it',
    website: 'https://milanfashiontest.it',
    base_city: 'Milano'
  });

  assert.ok(newAgency.id);
  assert.equal(S.eventPartners.length, initialEventCount + 1);
  assert.equal(S.prospects.length, initialWeddingCount, 'Wedding prospects count MUST NOT change');
  assert.equal(S.busPartners.length, initialBusCount, 'Bus partners count MUST NOT change');

  // 2. Update event partner
  await updateEventPartner(newAgency.id, { status: 'WANT_TO_CONTACT', notes: 'VIP Guest transfers' });
  const updated = S.eventPartners.find((p) => p.id === newAgency.id);
  assert.equal(updated.status, 'WANT_TO_CONTACT');
  assert.equal(S.prospects.length, initialWeddingCount, 'Wedding prospects count MUST remain intact after update');
  assert.equal(S.busPartners.length, initialBusCount, 'Bus partners count MUST remain intact after update');

  // 3. Remove event partner
  await removeEventPartner(newAgency.id);
  assert.equal(S.eventPartners.length, initialEventCount);
  assert.equal(S.prospects.length, initialWeddingCount, 'Wedding prospects count MUST remain intact after delete');
  assert.equal(S.busPartners.length, initialBusCount, 'Bus partners count MUST remain intact after delete');
});

test('Event Outreach Sending Safeguards: jobs.ts strictly enforces EVENTS_SMTP_USER and prevents using dmitri@dorogo.eu', () => {
  const jobsCode = fs.readFileSync(path.join(rootDir, 'supabase/functions/_shared/jobs.ts'), 'utf8');
  const cronCode = fs.readFileSync(path.join(rootDir, 'supabase/functions/outreach-cron/index.ts'), 'utf8');

  // Verify sendDueEvents exists
  assert.ok(jobsCode.includes('export async function sendDueEvents'), 'jobs.ts must export sendDueEvents');

  // Extract sendDueEvents function body
  const fnStart = jobsCode.indexOf('export async function sendDueEvents');
  const fnEnd = jobsCode.indexOf('// ---------------- Inbox & Conversational AI ----------------', fnStart);
  const sendDueEventsBody = jobsCode.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 1500);

  // Verify it queries ONLY event_planners table
  assert.ok(sendDueEventsBody.includes("db.from('event_planners')"), "sendDueEvents must query event_planners table");
  assert.ok(!sendDueEventsBody.includes("db.from('prospects')"), "sendDueEvents must NEVER query prospects");
  assert.ok(!sendDueEventsBody.includes("db.from('bus_partners')"), "sendDueEvents must NEVER query bus_partners");

  // Verify dedicated sender environment variable check
  assert.ok(sendDueEventsBody.includes("env('EVENTS_SMTP_USER')"), "sendDueEvents must enforce EVENTS_SMTP_USER");

  // Verify hard isolation error if anyone attempts to use primary wedding mailbox
  assert.ok(sendDueEventsBody.includes('Isolation Violation: Event outreach MUST NOT use primary wedding mailbox'), 'Must throw isolation violation error if dmitri@dorogo.eu is used');

  // Verify cron integration
  assert.ok(cronCode.includes("job === 'events_send'"), 'outreach-cron must have isolated events_send job');
});

test('Event Outreach Categories & Status Constants: Cover required verticals', () => {
  assert.ok(EVENT_AGENCY_TYPES.some((t) => t.key === 'tier1'));
  assert.ok(EVENT_AGENCY_TYPES.some((t) => t.key === 'uk_north'));
  assert.ok(EVENT_AGENCY_TYPES.some((t) => t.key === 'dach_benelux'));
  assert.ok(EVENT_AGENCY_TYPES.some((t) => t.key === 'france_spain'));
  assert.ok(EVENT_AGENCY_TYPES.some((t) => t.key === 'rest_world'));

  assert.ok(EVENT_STATUSES.some((s) => s.key === 'TO_REVIEW'));
  assert.ok(EVENT_STATUSES.some((s) => s.key === 'WANT_TO_CONTACT'));
  assert.ok(EVENT_STATUSES.some((s) => s.key === 'CONTACTED'));
  assert.ok(EVENT_STATUSES.some((s) => s.key === 'APPROVED_PARTNER'));
});

test('Event Template Engine: renderEventTemplate accurately interpolates international exhibitors with zero unrendered tokens', () => {
  assert.ok(Array.isArray(EVENT_FAIRS) && EVENT_FAIRS.length >= 4);
  assert.equal(EVENT_FAIRS[0].id, 'milano_home_2027');

  assert.ok(Array.isArray(DEFAULT_EVENT_TEMPLATES) && DEFAULT_EVENT_TEMPLATES.length >= 3);
  const t1 = DEFAULT_EVENT_TEMPLATES.find((t) => t.key === 'T1_exhibitor_intro');
  assert.ok(t1, 'T1_exhibitor_intro must exist');

  // Test with Addison Ross Ltd (UK)
  const addison = INITIAL_EVENT_PARTNERS.find((p) => p.name.includes('ADDISON ROSS'));
  assert.ok(addison, 'Addison Ross Ltd must exist in seed partners');

  const rendered = renderEventTemplate(t1, addison);
  assert.ok(rendered.subject.includes('ADDISON ROSS LTD'));
  assert.ok(rendered.subject.includes('Milano Home 2027'));
  assert.ok(!rendered.subject.includes('{{'));
  assert.ok(!rendered.body.includes('{{'), 'Rendered body must contain zero unresolved {{token}} placeholders');
  assert.ok(rendered.body.includes('Fiera Milano Rho'));
  assert.ok(rendered.body.includes('David'), 'Rendered body must address recipient by first name David');
  assert.ok(rendered.body.includes('Hi David,'), 'Greeting must be Hi David,');

  // Test with Serax NV (Belgium)
  const serax = INITIAL_EVENT_PARTNERS.find((p) => p.name.includes('SERAX'));
  assert.ok(serax, 'Serax NV must exist');
  const renderedSerax = renderEventTemplate(t1, serax);
  assert.ok(renderedSerax.subject.includes('SERAX NV'));
  assert.ok(!renderedSerax.body.includes('{{'));
});

test('Hostinger Signature Decoupling & Verified Authentic Fiera Data: templates are clean of duplicate signatures and use {{first_name}}', () => {
  // 1. Verify templates never contain Dmitri
  for (const tmpl of DEFAULT_EVENT_TEMPLATES) {
    assert.ok(!tmpl.body.includes('dmitri@dorogo.eu'), 'Must NEVER contain wedding sender email');
    assert.ok(!tmpl.body.includes('Dmitri Traciuc'), 'Must NEVER contain Dmitri Traciuc for events');
  }

  // 2. Verify Van Der Gucht has real domain and genuine email
  const vdg = INITIAL_EVENT_PARTNERS.find((p) => p.name.includes('VAN DER GUCHT'));
  assert.ok(vdg, 'Van Der Gucht must exist in international exhibitors list');
  assert.equal(vdg.website, 'https://www.vdg.be/', 'Van Der Gucht website must be https://www.vdg.be/');
  assert.equal(vdg.email, 'christmas@vdg.be', 'Van Der Gucht email must be authentic christmas@vdg.be');
  assert.equal(vdg.country, 'Belgium');

  // 3. Verify zero synthetic placeholder domains
  for (const p of INITIAL_EVENT_PARTNERS) {
    assert.ok(!p.website.includes('vanderguchtsince1870.com'), 'Must not contain guessed vanderguchtsince1870 domain');
  }
});

test('Whali Cold Outreach Benchmarks: event templates strictly adhere to <100 words and ultra-lean format', () => {
  const t1 = DEFAULT_EVENT_TEMPLATES.find((t) => t.key === 'T1_exhibitor_intro');
  const t2 = DEFAULT_EVENT_TEMPLATES.find((t) => t.key === 'T2_exhibitor_followup');

  assert.ok(t1, 'T1 must exist');
  assert.ok(t2, 'T2 must exist');

  const wordsT1 = t1.body.trim().split(/\s+/).length;
  const wordsT2 = t2.body.trim().split(/\s+/).length;

  assert.ok(wordsT1 < 100, `T1 body must be under 100 words for 6x reply rate; got ${wordsT1} words`);
  assert.ok(wordsT2 < 100, `T2 body must be under 100 words for 6x reply rate; got ${wordsT2} words`);

  // Max 2 cold touches (T1 + 1 follow-up)
  const coldTouches = DEFAULT_EVENT_TEMPLATES.filter((t) => t.step_num <= 2);
  assert.equal(coldTouches.length, 2, 'Must have exactly 2 cold touches (T1 + T2 follow-up) to avoid unsubscribe surge');
});
