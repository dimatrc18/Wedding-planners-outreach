-- One-time setup of the scheduler. Run in the Supabase SQL editor (Dashboard → SQL).
-- 1. Replace PASTE_CRON_SECRET with the value of the OUTREACH_CRON_SECRET function secret.
-- 2. Run the whole file:
--    - outreach-dispatch (every 2m): sync inbox (10s timeout) -> send wedding planners -> send bus partners -> tick drafts
--    - outreach-research (every 30m): background lead scraping via Jina
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('PASTE_CRON_SECRET', 'outreach_cron_secret', 'Shared secret for the outreach-cron edge function');

-- Primary dispatch: every 2 minutes for outbound email delivery & progression
select cron.schedule(
  'outreach-dispatch',
  '*/2 * * * *',
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

-- Background lead research: every 30 minutes
select cron.schedule(
  'outreach-research',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/functions/v1/outreach-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'outreach_cron_secret')
    ),
    body := '{"job":"research"}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- To stop them:
-- select cron.unschedule('outreach-dispatch');
-- select cron.unschedule('outreach-research');
-- To check: select * from cron.job_run_details order by start_time desc limit 10;
