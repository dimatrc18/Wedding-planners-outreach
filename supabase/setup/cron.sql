-- One-time setup of the scheduler. Run in the Supabase SQL editor (Dashboard → SQL).
-- 1. Replace PASTE_CRON_SECRET with the value of the OUTREACH_CRON_SECRET function secret.
--    (If you lost it: `supabase secrets set OUTREACH_CRON_SECRET=<new random string>` and use that.)
-- 2. Run the whole file. It calls the outreach-cron function every 10 minutes:
--    inbox sync → draft due steps → send approved mail in the window → 08:30 Telegram digest.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('PASTE_CRON_SECRET', 'outreach_cron_secret', 'Shared secret for the outreach-cron edge function');

select cron.schedule(
  'outreach-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/functions/v1/outreach-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'outreach_cron_secret')
    ),
    body := '{"job":"all"}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- To stop it:   select cron.unschedule('outreach-every-10-min');
-- To check it:  select * from cron.job_run_details order by start_time desc limit 10;
