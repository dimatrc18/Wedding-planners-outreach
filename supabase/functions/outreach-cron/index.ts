// Scheduled every 10 minutes by pg_cron (see supabase/setup/cron.sql). Body: { "job": "all" | "tick" | "send" | "inbox" | "digest" }.
// Each job is safe to run at any time: drafting is idempotent, sending only takes approved and due mail.
import { handle, json, requireCronOrUser, loadSettings, setState } from '../_shared/server.ts';
import { draftDueSteps, sendDue, syncInbox, sendDigest } from '../_shared/jobs.ts';

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
  if (job === 'all' || job === 'inbox') await run('inbox', () => syncInbox(db, settings, now)); // replies first: they stop sequences
  if (job === 'all' || job === 'tick') await run('tick', () => draftDueSteps(db, settings, now));
  if (job === 'all' || job === 'send') await run('send', () => sendDue(db, settings, now, { actor }));
  if (job === 'all' || job === 'digest') await run('digest', () => sendDigest(db, settings, now));
  await setState(db, 'cron', { last_run_at: now.toISOString(), job, result: out });
  return json(out);
}));
