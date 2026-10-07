-- DOROGO partner outreach: schema. Copied into the migration by scripts/gen-migration.mjs.
-- All tables are readable and writable only by emails in public.allowed_users (see is_allowed()).
-- Edge functions use the service role and bypass RLS.

-- The first test table: dropped when empty, otherwise kept aside as planners_legacy.
do $$ begin
  if to_regclass('public.planners') is not null then
    if exists (select 1 from public.planners) then alter table public.planners rename to planners_legacy;
    else drop table public.planners; end if;
  end if;
end $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'planner' check (type in ('planner','venue','photographer','concierge_hotel')),
  agency_name text not null,
  contact_name text,
  role text,
  email text,
  email_status text not null default 'unknown' check (email_status in ('unknown','syntax_ok','mx_ok','no_mx','invalid','bounced')),
  phone text,
  whatsapp text,
  whatsapp_opt_in boolean not null default false,
  website text,
  instagram_handle text,
  linkedin text,
  location text,
  segment text check (segment in ('boutique_local','high_volume_uk_us','international')),
  source text not null default 'manual',
  source_detail text,
  verified_reviews_count int,
  rating numeric(2,1),
  review_source text,
  avg_weddings_per_year_estimate int,
  typical_guest_count int,
  key_venues text[] not null default '{}',
  personalization_hook text,
  hook_source_url text,
  hook_type text check (hook_type in ('venue','event','style','press','award','other')),
  hook_confidence text check (hook_confidence in ('high','medium','low')),
  hook_needs_review boolean not null default false,
  language text not null default 'en' check (language in ('en','it','de','fr')),
  timezone text not null default 'Europe/Rome',
  priority_score int not null default 0,
  status text not null default 'researching' check (status in ('researching','ready','t1_sent','t2_sent','t3_sent','t4_sent','replied','rate_card_sent','in_conversation','quote_requested','fam_offered','partner_won','lost','nurture','do_not_contact')),
  owner text,
  tags text[] not null default '{}',
  notes text,
  do_not_contact boolean not null default false,
  unsubscribed_at timestamptz,
  sequence_paused boolean not null default false,
  snoozed_until timestamptz,
  resume_at timestamptz,
  nurture_until timestamptz,
  lost_reason text,
  partner_model text check (partner_model in ('referral_12','net_whitelabel')),
  reengage_at timestamptz,
  fam_status text check (fam_status in ('offered','accepted','completed','declined')),
  fam_at timestamptz,
  last_touch_at timestamptz,
  enrichment jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index prospects_email_unique on public.prospects (lower(email)) where email is not null and email <> '';
create index prospects_status on public.prospects (status);
create trigger prospects_updated before update on public.prospects for each row execute function public.touch_updated_at();

create table public.touches (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  channel text not null check (channel in ('email','instagram_dm','whatsapp','call','in_person','linkedin')),
  direction text not null check (direction in ('out','in')),
  step_name text not null default 'custom',
  state text not null default 'draft' check (state in ('draft','approved','sent','skipped','failed','received')),
  subject text,
  body text,
  template_key text,
  variant text,
  ai_generated boolean not null default false,
  lint jsonb,
  approved_by text,
  approved_at timestamptz,
  scheduled_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  bounced boolean not null default false,
  reply_sentiment text check (reply_sentiment in ('positive','neutral','negative','ooo','unsubscribe')),
  reply_intent text check (reply_intent in ('wants_rate_card','asks_pricing','has_supplier','not_now','referral_to_other','meeting_request')),
  classification jsonb,
  handled_at timestamptz,
  suggested_for uuid references public.touches(id) on delete set null,
  attach_rate_card boolean not null default false,
  message_id text,
  in_reply_to text,
  thread_id text,
  from_address text,
  to_address text,
  error text,
  send_attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One live touch per cadence step and prospect: the cron drafter and the browser can never double-draft.
create unique index touches_one_live_step on public.touches (prospect_id, step_name)
  where direction = 'out' and step_name in ('T1_intro','T2_ig_dm','T3_followup','T4_breakup') and state in ('draft','approved','sent');
create unique index touches_message_id on public.touches (message_id) where message_id is not null;
create index touches_due on public.touches (state, scheduled_at);
create index touches_prospect on public.touches (prospect_id, created_at);
create trigger touches_updated before update on public.touches for each row execute function public.touch_updated_at();

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  title text,
  stage text not null default 'open' check (stage in ('open','quote_sent','won','lost')),
  model text check (model in ('referral_12','net_whitelabel')),
  wedding_date date,
  venue text,
  guest_count int,
  estimated_value numeric(10,2),
  quote_items jsonb not null default '[]',
  quote_sent_at timestamptz,
  deposit_received boolean not null default false,
  won boolean,
  lost_reason text,
  actual_revenue numeric(10,2),
  commission_owed numeric(10,2) not null default 0,
  commission_paid numeric(10,2) not null default 0,
  commission_paid_at timestamptz,
  concierge_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index opportunities_prospect on public.opportunities (prospect_id);
create trigger opportunities_updated before update on public.opportunities for each row execute function public.touch_updated_at();

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  language text not null default 'en',
  kind text not null default 'sequence' check (kind in ('sequence','reply','nudge')),
  name text,
  subject_a text,
  subject_b text,
  body text not null,
  attach_rate_card boolean not null default false,
  active boolean not null default true,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  unique (key, language)
);
create trigger templates_updated before update on public.templates for each row execute function public.touch_updated_at();

-- Single row: send windows, caps, cadence steps, kill switch, targets.
create table public.outreach_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create trigger outreach_settings_updated before update on public.outreach_settings for each row execute function public.touch_updated_at();

-- Machine state written by the edge functions (mailbox sync cursor, last run, errors).
create table public.outreach_state (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.events_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text,
  prospect_id uuid references public.prospects(id) on delete cascade,
  action text not null,
  detail jsonb not null default '{}'
);
create index events_log_at on public.events_log (at desc);

create table public.ai_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null,
  prompt_version text,
  model text,
  prospect_id uuid references public.prospects(id) on delete cascade,
  input jsonb,
  output jsonb,
  error text
);

-- Row Level Security: allowed users only.
do $$
declare t text;
begin
  foreach t in array array['prospects','touches','opportunities','templates','outreach_settings','outreach_state','events_log','ai_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "allowed users" on public.%I for all to authenticated using (public.is_allowed()) with check (public.is_allowed())', t);
  end loop;
end $$;

-- Private bucket for the rate card PDF and other attachments.
insert into storage.buckets (id, name, public) values ('outreach', 'outreach', false) on conflict (id) do nothing;
create policy "outreach bucket allowed users" on storage.objects for all to authenticated
  using (bucket_id = 'outreach' and public.is_allowed()) with check (bucket_id = 'outreach' and public.is_allowed());

-- Live updates in the browser (new replies appear without a reload).
alter publication supabase_realtime add table public.touches, public.prospects;
