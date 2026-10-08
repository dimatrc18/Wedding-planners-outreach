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

-- ---------------- Seed ----------------
insert into public.outreach_settings (id, data) values (1, '{"kill_switch":false,"timezone":"Europe/Rome","send_days":[2,3,4],"window_start":"09:00","window_end":"11:30","daily_cap":12,"warmup":{"enabled":true,"start":6,"weekly_increment":3},"jitter_min":4,"jitter_max":11,"season_mode":"auto","bounce_pause_rate":0.03,"bounce_min_sample":15,"steps":[{"key":"T1_intro","label":"Intro email","day":0,"channel":"email","thread":false,"require_approval":true,"enabled":true},{"key":"T3_followup","label":"Follow-up email","day":4,"channel":"email","thread":true,"require_approval":true,"enabled":true},{"key":"T4_breakup","label":"Breakup email (new thread)","day":9,"channel":"email","thread":false,"require_approval":true,"enabled":true}],"sender":{"name":"Dmitri","email":"dmitri@dorogo.eu","reply_to":"dmitri@dorogo.eu"},"track_opens":false,"stale_days":10,"ratecard_nudge_days":5,"human_escalation_hours":2,"nurture_month_day":"10-01","targets":{"open_rate":0.5,"positive_reply_rate":0.1,"positive_reply_rate_high":0.15,"ratecard_to_quote":0.25,"partners_won":5,"partners_won_high":10},"avg_wedding_transport_value":10000,"commission_rate":0.05}'::jsonb) on conflict (id) do nothing;

insert into public.templates (key, language, kind, name, subject_a, subject_b, body, attach_rate_card) values
('T1_intro', 'en', 'sequence', 'T1 Intro email', '{{subject_line_a}}', '{{subject_line_b}}', '{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{signature}}

{{optout}}', false),
('T3_followup', 'en', 'sequence', 'T3 Follow-up (Guest Transfer Portal)', '', '', '{{greeting}}

One thing our partner planners tell us saves them the most hours before a wedding is our private Guest Transfer Portal.

You drop a custom link onto the couple''s wedding website, guests enter their own flight details, and our team groups arrivals into shared or private Mercedes-Benz V-Class and E-Class transfers, tracks every flight on radar, and bills guests directly via SumUp. Your team never has to chase flight spreadsheets or guest payments.

We also run 16 to 50-seat minibuses and coaches alongside our Mercedes-Benz fleet, so we can match compact minibuses to narrow lakeside villa gates and 50-seaters to main hotel transfers.

Would it be helpful to see our 1-page partner rate card and how the portal works?

{{signature}}

{{optout}}', false),
('T4_breakup', 'en', 'sequence', 'T4 Breakup email (new thread)', '{{agency}} · private transport on Lake Como & Northern Italy', 'Airport transfer on your next Milan site visit · {{agency}}', '{{greeting}}

I will leave this here so I do not crowd your inbox while you are deep in planning.

Next time you fly into Malpensa or Linate for a client venue visit, message me on WhatsApp and we will gladly host your airport transfer on us so you can experience our chauffeurs firsthand. Whenever you need a team to take over the guest transport logistics for a wedding weekend, we are one reply away.

Wishing you a calm, successful season.

{{signature}}

{{optout}}', false),
('T1_intro', 'it', 'sequence', 'T1 Email di presentazione', '{{subject_line_a}}', '{{subject_line_b}}', '{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{signature}}

{{optout}}', false),
('T3_followup', 'it', 'sequence', 'T3 Follow-up (Portale Ospiti)', '', '', '{{greeting}}

Uno strumento che fa risparmiare decine di ore ai wedding planner con cui lavoriamo è il nostro Portale Ospiti dedicato.

Inserite un link riservato sul sito degli sposi, gli ospiti registrano i propri voli in autonomia e il nostro team organizza i transfer in Mercedes-Benz Classe V e Classe E, monitora i voli sul radar e gestisce i singoli pagamenti tramite SumUp. Il vostro studio non deve più rincorrere fogli Excel con i voli o pagamenti degli invitati.

Disponiamo inoltre di minibus e pullman da 16 a 50 posti, così da abbinare mezzi compatti per i viali stretti delle ville e pullman da 50 posti per gli spostamenti principali.

Vi fa comodo ricevere la nostra tariffa partner di una pagina per vedere come funziona?

{{signature}}

{{optout}}', false),
('T4_breakup', 'it', 'sequence', 'T4 Email di chiusura (nuovo thread)', '{{agency}} · logistica trasporti Lago di Como e Nord Italia', 'Transfer per i vostri prossimi sopralluoghi · {{agency}}', '{{greeting}}

Chiudo qui per non affollare la vostra casella durante i preparativi.

La prossima volta che avete un sopralluogo con una coppia tra Milano, i laghi o le Alpi, scrivetemi su WhatsApp: saremo felici di offrirvi un transfer di prova per farvi conoscere di persona i nostri autisti. Quando vorrete delegare l''intera logistica trasporti di un matrimonio, siamo a un messaggio di distanza.

Buon lavoro e buona stagione.

{{signature}}

{{optout}}', false),
('rate_card_delivery', 'en', 'reply', 'Rate card delivery (attach PDF)', '', '', '{{greeting}}

Here is our 1-page partner rate card, attached.

It covers fixed net rates from Malpensa, Linate and Lugano to the lake, hourly service, and the late-night villa shuttle. You can either include our confidential net rates directly in your client offer with your own markup, or work with us on a 5% referral commission where we bill the couple directly.

If you have a date and venue in mind, send them with the guest count and I''ll draft the transport plan.

{{signature}}', true),
('rate_card_delivery', 'it', 'reply', 'Invio tariffa (PDF allegato)', '', '', '{{greeting}}

In allegato la nostra tariffa partner, in una pagina.

Contiene le tariffe nette fisse da Malpensa, Linate e Lugano verso il lago, il servizio orario e la navetta notturna dalle ville. Potete inserire le nostre tariffe nette riservate direttamente nella vostra offerta agli sposi, oppure lavorare con noi con una commissione del 5% sulle prenotazioni segnalate, dove fatturiamo direttamente agli sposi.

Se avete già una data e una location, mandatemi anche il numero di ospiti e preparo il piano dei transfer.

{{signature}}', true),
('reply_asks_pricing', 'en', 'reply', 'Reply: asks for prices', '', '', '{{greeting}}

The rate card is attached. As a guide, a Mercedes-Benz V-Class from Malpensa to Como is €230 net, and to Bellagio €320. The late-night villa shuttle is €450 per V-Class for continuous return loops to local hotels.

If you share the date, venue and guest count, I''ll put together a full transport plan with a fixed price.

{{signature}}', true),
('reply_meeting_request', 'en', 'reply', 'Reply: wants a call', '', '', '{{greeting}}

Happy to talk. I''m free {{slot_1}} or {{slot_2}}, or send me a time that suits you better. My direct line is +32 456 14 14 97.

{{signature}}', false),
('reply_has_supplier', 'en', 'reply', 'Reply: already has a supplier', '', '', '{{greeting}}

Thank you for letting me know. A second supplier can help on peak weekends, when your main one is fully booked. If that ever happens, we can cover a single late-night shuttle or a full airport day, and the rate card is here for your files.

{{signature}}', false),
('reply_not_now', 'en', 'reply', 'Reply: not now / next season', '', '', '{{greeting}}

Understood, and thank you. I''ll write again before next season. If a date comes up sooner, a reply here is all it takes.

{{signature}}', false),
('reply_referral_to_other', 'en', 'reply', 'Reply: points to a colleague', '', '', '{{greeting}}

Thank you for pointing me in the right direction. I''ll write to {{referred_name}} directly and mention that you suggested it.

{{signature}}', false),
('ratecard_nudge', 'en', 'nudge', 'Nudge: rate card sent, no answer', '', '', '{{greeting}}

A quick check that the rate card reached you. If one of next season''s weddings needs guests moved between Milan and the lake, send me the date and venue and I''ll sketch the transport plan.

{{signature}}', false),
('fam_followup', 'en', 'nudge', 'After a FAM transfer', '', '', '{{greeting}}

Thank you for riding with us. I''d value one line on how it went, and on anything you would want different for your couples'' guests.

{{signature}}', false),
('reply_generic', 'en', 'reply', 'Reply: blank', '', '', '{{greeting}}

{{your_reply}}

{{signature}}', false)
on conflict (key, language) do nothing;

insert into public.prospects (type, agency_name, contact_name, source, review_source, rating, verified_reviews_count, location, segment, tags, notes, priority_score) values
('planner', 'WP Bellagio', null, 'matrimonio.com', 'matrimonio.com', '5', '27', 'Bellagio', 'boutique_local', array['seed','priority']::text[], null, '64'),
('planner', 'Federica Cantù Wedding Planner', null, 'matrimonio.com', 'matrimonio.com', '5', '41', null, 'boutique_local', array['seed','priority']::text[], null, '57'),
('planner', 'Como Luxury Wedding', null, 'matrimonio.com', 'matrimonio.com', '5', '11', null, 'boutique_local', array['seed','priority']::text[], null, '57'),
('planner', 'Perlee', null, 'matrimonio.com', 'matrimonio.com', '5', '26', null, 'boutique_local', array['seed','priority']::text[], null, '57'),
('planner', 'I Do in Lake Como', null, 'manual', 'google', null, null, null, 'boutique_local', array['seed','priority']::text[], 'Strong Google reviews (brief). Re-verify rating and count.', '39'),
('planner', 'SugarEvents', null, 'matrimonio.com', 'matrimonio.com', '4.9', '70', 'Laglio', 'boutique_local', array['seed','priority']::text[], 'Laglio / Milan.', '64'),
('planner', 'Best Day Ever', 'Barbara Botta', 'manual', null, null, null, null, null, array['seed']::text[], null, '29'),
('planner', 'Kiss & Escape', null, 'manual', null, null, null, null, null, array['seed']::text[], null, '25'),
('planner', 'Lena Freitag Weddings', null, 'manual', null, null, null, null, null, array['seed']::text[], null, '25'),
('planner', 'Romance in Italy', null, 'manual', null, null, null, null, null, array['seed']::text[], null, '25'),
('planner', 'Erika Romano Weddings', null, 'manual', null, null, null, null, null, array['seed']::text[], null, '25'),
('planner', 'Sabine Wedding Planner', null, 'manual', null, null, null, null, null, array['seed','unverified']::text[], 'Unverified in the brief: deprioritised.', '15'),
('venue', 'Relais Villa Vittoria', null, 'manual', null, null, null, 'Laglio', null, array['seed','backdoor']::text[], 'Venue with in-house event coordinator (referral backdoor).', '32'),
('venue', 'Villa Lario', null, 'manual', null, null, null, null, null, array['seed','backdoor']::text[], 'Written "Villa Larío" in the brief. Confirm the exact property.', '25'),
('venue', 'Filario', null, 'manual', null, null, null, 'Lezzeno', null, array['seed','backdoor']::text[], null, '32'),
('venue', 'Villa Cipressi', null, 'manual', null, null, null, 'Varenna', null, array['seed','backdoor']::text[], null, '32'),
('concierge_hotel', 'Grand Hotel Imperiale', null, 'manual', null, null, null, 'Moltrasio', null, array['seed','backdoor']::text[], null, '32'),
('planner', 'The Lake Como Wedding Planner', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '10'),
('planner', 'SposiamoVi', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '10'),
('planner', 'Eventoile', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '10'),
('planner', 'Elena Renzi', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '10'),
('planner', 'Matthew Oliver', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '10');
