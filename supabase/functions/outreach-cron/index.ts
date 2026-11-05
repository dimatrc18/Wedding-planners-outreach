// Scheduled by pg_cron. Body: { "job": "all" | "dispatch" | "send" | "bus_send" | "tick" | "inbox" | "digest" | "research" }.
// Each job is safe to run at any time: drafting is idempotent, sending only takes approved and due mail.
import { handle, json, requireCronOrUser, loadSettings, setState } from '../_shared/server.ts';
import { autoResearchPending, draftDueSteps, sendDue, syncInbox, sendDigest, checkUnansweredReplies, sendDueBusPartners, sendDueEvents } from '../_shared/jobs.ts';

Deno.serve((req) => handle(req, async () => {
  const { db, actor } = await requireCronOrUser(req);
  const body = await req.json().catch(() => ({}));
  const job = body.job || 'all';
  const settings = await loadSettings(db);
  const now = new Date();
  const out: Record<string, unknown> = {};
  const run = async (name: string, fn: () => Promise<unknown>) => {
    try { out[name] = await fn(); } catch (e) { out[name] = { error: (e as Error).message }; }
  };

  // 1. Inbound processing (stops sequences on replies) - max 10s timeout guard
  if (job === 'all' || job === 'inbox' || job === 'dispatch') {
    await run('inbox', () => Promise.race([
      syncInbox(db, settings, now),
      new Promise((_, reject) => setTimeout(() => reject(new Error('inbox_timeout_10s')), 10000))
    ]));
  }

  // 2. High-priority delivery: Wedding Planners & Bus Partners
  if (job === 'all' || job === 'send' || job === 'dispatch') await run('send', () => sendDue(db, settings, now, { actor }));
  if (job === 'all' || job === 'bus_send' || job === 'dispatch') await run('bus_send', () => sendDueBusPartners(db, settings, now, { actor }));
  if (job === 'all' || job === 'events_send' || job === 'dispatch') await run('events_send', () => sendDueEvents(db, settings, now, { actor }));

  // 3. Cadence progression & drafting
  if (job === 'all' || job === 'tick' || job === 'dispatch') await run('tick', () => draftDueSteps(db, settings, now));
  if (job === 'all' || job === 'checkup') await run('checkup', () => checkUnansweredReplies(db, settings, now));
  if (job === 'all' || job === 'digest') await run('digest', () => sendDigest(db, settings, now));

  // 4. Background research - only runs on explicit 'research' job to protect send compute budget
  if (job === 'research') await run('research', () => autoResearchPending(db, settings, now));

  await setState(db, 'cron', { last_run_at: now.toISOString(), job, result: out });
  return json(out);
}));


