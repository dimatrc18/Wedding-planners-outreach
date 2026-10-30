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
  EVENT_AGENCY_TYPES 
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
  assert.ok(EVENT_AGENCY_TYPES.some((t) => t.key === 'corporate_mice'));
  assert.ok(EVENT_AGENCY_TYPES.some((t) => t.key === 'fashion_luxury'));
  assert.ok(EVENT_AGENCY_TYPES.some((t) => t.key === 'brand_activation'));

  assert.ok(EVENT_STATUSES.some((s) => s.key === 'TO_REVIEW'));
  assert.ok(EVENT_STATUSES.some((s) => s.key === 'WANT_TO_CONTACT'));
  assert.ok(EVENT_STATUSES.some((s) => s.key === 'CONTACTED'));
  assert.ok(EVENT_STATUSES.some((s) => s.key === 'APPROVED_PARTNER'));
});
