import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S, startDemo } from '../app/store.js';
import * as A from '../app/actions.js';
import * as core from '../supabase/functions/_shared/core/index.js';

test('rescueManualLead: rejects invalid email syntax', async () => {
  await startDemo();
  const p = { id: 'p-test-invalid', agency_name: 'Test Agency', email: '' };
  await assert.rejects(
    async () => A.rescueManualLead(p, 'not-an-email'),
    /Please enter a valid email address/
  );
  await assert.rejects(
    async () => A.rescueManualLead(p, ''),
    /Please enter a valid email address/
  );
});

test('rescueManualLead: rescues a lead with missing email into Scheduled Outbox', async () => {
  await startDemo();
  const p = {
    id: 'p-no-email-1',
    agency_name: 'Bellagio Dream Weddings',
    email: '',
    email_status: 'unknown',
    status: 'researching',
    location: 'Bellagio',
    market: 'it',
    language: 'it',
    tags: ['manual_touch'],
    personalization_hook: 'Villa Serbelloni logistics',
  };
  S.prospects.push(p);

  const res = await A.rescueManualLead(p, 'info@bellagiodreamweddings.com', { autoApprove: true });

  assert.equal(p.email, 'info@bellagiodreamweddings.com');
  assert.equal(p.email_status, 'mx_ok');
  assert.equal(p.bounced, false);
  assert.equal(p.status, 'ready');
  assert.equal(p.tags.includes('manual_touch'), false);

  // Check generated touch
  assert.ok(res.touch, 'Touch should be created');
  assert.equal(res.touch.step_name, 'T1_intro');
  assert.equal(res.touch.state, 'approved');
  assert.equal(res.touch.to_address, 'info@bellagiodreamweddings.com');
  assert.ok(res.touch.scheduled_at, 'Should have a scheduled slot');

  // Verify canSend gate accepts it (it is scheduled in a future slot, not blocked by email issues)
  const gate = core.canSend(res.touch, p, A.touchesOf(p.id), S.settings, {
    now: new Date(),
    sentToday: 0,
    firstSendAt: null,
  });
  assert.ok(['outside_window', 'season_paused', 'not_due'].includes(gate.reason) || gate.ok, `Expected send window check or ok, got: ${gate.reason}`);
  assert.notEqual(gate.reason, 'no_email');
  assert.notEqual(gate.reason, 'bounced_email');

  // Verify it appears in todayData().scheduled
  const td = A.todayData();
  const foundInScheduled = td.scheduled.some((t) => t.prospect_id === p.id);
  assert.ok(foundInScheduled, 'Rescued lead must appear in Scheduled Outbox');
});

test('rescueManualLead: rescues a bounced lead, archives old bounced touch, and re-arms in Outbox', async () => {
  await startDemo();
  const p = {
    id: 'p-bounced-1',
    agency_name: 'Varenna Events',
    email: 'old-dead@varenna.it',
    email_status: 'bounced',
    bounced: true,
    bounced_email: 'old-dead@varenna.it',
    do_not_contact: true,
    status: 'do_not_contact',
    location: 'Varenna',
    market: 'it',
    language: 'it',
    enrichment: {
      known_bad_emails: ['old-dead@varenna.it'],
    },
    tags: ['bounced'],
    personalization_hook: 'Villa Monastero guest coordination',
  };
  S.prospects.push(p);

  const oldBouncedTouch = {
    id: 't-bounced-old',
    prospect_id: p.id,
    direction: 'out',
    channel: 'email',
    step_name: 'T1_intro',
    state: 'sent',
    bounced: true,
    to_address: 'old-dead@varenna.it',
    subject: 'Coordinamento transfer Lake Como',
  };
  S.touches.push(oldBouncedTouch);

  const res = await A.rescueManualLead(p, 'contact@varennaevents.com', { autoApprove: true });

  // Prospect is revived
  assert.equal(p.email, 'contact@varennaevents.com');
  assert.equal(p.email_status, 'mx_ok');
  assert.equal(p.bounced, false);
  assert.equal(p.do_not_contact, false);
  assert.equal(p.status, 'ready');
  assert.equal(p.tags.includes('bounced'), false);

  // Old touch in store is archived to skipped so unique constraint touches_one_live_step is not violated
  const archived = S.touches.find((t) => t.id === 't-bounced-old');
  assert.equal(archived.state, 'skipped');
  assert.match(archived.error, /Bounced on previous address/);

  // New approved touch is scheduled with the new recipient
  assert.ok(res.touch);
  assert.equal(res.touch.step_name, 'T1_intro');
  assert.equal(res.touch.state, 'approved');
  assert.equal(res.touch.to_address, 'contact@varennaevents.com');
  assert.equal(res.touch.bounced, false);
  assert.ok(res.touch.scheduled_at);

  // Appears in Scheduled Outbox
  const td = A.todayData();
  const foundInScheduled = td.scheduled.some((t) => t.prospect_id === p.id && t.to_address === 'contact@varennaevents.com');
  assert.ok(foundInScheduled, 'New touch must be in Scheduled Outbox');
});

test('rescueManualLead: supports autoApprove: false to place in review queue (drafts)', async () => {
  await startDemo();
  const p = {
    id: 'p-draft-mode',
    agency_name: 'Tremezzo Weddings',
    email: '',
    email_status: 'no_mx',
    status: 'ready',
    location: 'Tremezzo',
    market: 'en',
    language: 'en',
    personalization_hook: 'Grand Hotel Tremezzo logistics',
  };
  S.prospects.push(p);

  const res = await A.rescueManualLead(p, 'concierge@tremezzoweddings.com', { autoApprove: false });

  assert.equal(p.email, 'concierge@tremezzoweddings.com');
  assert.equal(res.touch.state, 'draft');
  assert.equal(res.touch.to_address, 'concierge@tremezzoweddings.com');

  const td = A.todayData();
  const foundInDrafts = td.drafts.some((t) => t.prospect_id === p.id);
  assert.ok(foundInDrafts, 'Touch must be in drafts review queue');
});
