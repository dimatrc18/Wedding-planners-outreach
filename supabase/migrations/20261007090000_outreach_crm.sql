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
insert into public.outreach_settings (id, data) values (1, '{"kill_switch":false,"timezone":"Europe/Rome","send_days":[2,3,4],"window_start":"09:00","window_end":"11:30","daily_cap":12,"warmup":{"enabled":true,"start":6,"weekly_increment":3},"jitter_min":4,"jitter_max":11,"season_mode":"auto","bounce_pause_rate":0.03,"bounce_min_sample":15,"steps":[{"key":"T1_intro","label":"Step 1 (Intro email)","day":0,"channel":"email","thread":false,"require_approval":false,"enabled":true},{"key":"T3_followup","label":"Step 2 (Follow-up 1)","day":4,"channel":"email","thread":true,"require_approval":true,"enabled":true},{"key":"T4_breakup","label":"Step 3 (Follow-up 2 · disabled)","day":9,"channel":"email","thread":false,"require_approval":true,"enabled":false}],"sender":{"name":"Dmitri","email":"dmitri@dorogo.eu","reply_to":"dmitri@dorogo.eu"},"track_opens":false,"stale_days":10,"ratecard_nudge_days":5,"human_escalation_hours":2,"nurture_month_day":"10-01","targets":{"open_rate":0.5,"positive_reply_rate":0.1,"positive_reply_rate_high":0.15,"ratecard_to_quote":0.25,"partners_won":5,"partners_won_high":10},"avg_wedding_transport_value":10000,"commission_rate":0.1}'::jsonb) on conflict (id) do nothing;

insert into public.templates (key, language, kind, name, subject_a, subject_b, body, attach_rate_card) values
('T1_intro', 'en', 'sequence', 'Step 1 (Intro email)', '{{subject_line_a}}', '{{subject_line_b}}', '{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{signature}}

{{optout}}', false),
('T3_followup', 'en', 'sequence', 'Step 2 (Follow-up 1: Route & Vehicle Fit)', '', '', '{{greeting}}

One logistical detail worth adding for your {{venue}} weddings: rather than your team spending unbillable hours building arrival spreadsheets for 80+ guests, you can forward us your guest flight list and our dispatch desk clusters them into shared Mercedes-Benz V-Classes, monitors live Malpensa delays, and shares a live master manifest.

We also run 16 to 50-seat minibuses for larger groups. If transport ever gets tight on an upcoming date, feel free to message me on WhatsApp or reply here.

{{signature}}

{{optout}}', false),
('T4_breakup', 'en', 'sequence', 'Step 3 (Follow-up 2 · Final note)', 'Lake Como & Milan private guest transport', 'Guest transport on Lake Como', '{{greeting}}

Last note from me so I do not crowd your inbox. Whenever you need guest transport for a Lake Como or Milan date, feel free to message me on WhatsApp or reply here.

Wishing you a calm, successful season.

{{signature}}

{{optout}}', false),
('T1_intro', 'it', 'sequence', 'Step 1 (Email di presentazione)', '{{subject_line_a}}', '{{subject_line_b}}', '{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{signature}}

{{optout}}', false),
('T3_followup', 'it', 'sequence', 'Step 2 (Follow-up 1: Flotta e Portale)', '', '', '{{greeting}}

Un dettaglio operativo per i vostri matrimoni a {{venue}}: anziché farvi impiegare ore a incrociare fogli Excel per gli arrivi degli ospiti, potete semplicemente inoltrarci la lista dei voli e la nostra centrale organizza le navette Mercedes-Benz Classe V condivise, monitorando i ritardi a Malpensa in tempo reale.

Disponiamo inoltre di minibus da 16 a 50 posti per i gruppi più numerosi. Se dovesse servirvi supporto su una data intensa, scrivetemi pure su WhatsApp o rispondete a questa mail.

{{signature}}

{{optout}}', false),
('T4_breakup', 'it', 'sequence', 'Step 3 (Follow-up 2 · Chiusura)', 'Trasporti privati Lago di Como e Milano', 'Transfer ospiti Lago di Como', '{{greeting}}

Chiudo qui per non affollare la vostra casella. Quando vi servirà supporto per i trasferimenti ospiti sul Lago di Como o a Milano, scrivetemi pure su WhatsApp o rispondete qui.

Buona stagione.

{{signature}}

{{optout}}', false),
('T1_intro', 'ru', 'sequence', 'Step 1 (Email знакомства)', '{{subject_line_a}}', '{{subject_line_b}}', '{{greeting}}

{{hook}}

{{service_pitch}}

{{cta_line}}

{{signature}}

{{optout}}', false),
('T3_followup', 'ru', 'sequence', 'Step 2 (Follow-up 1: Автопарк и логистика)', '', '', '{{greeting}}

Полезная деталь для ваших свадеб в {{venue}}: чтобы ваши координаторы не тратили часы на составление таблиц прилета гостей в Excel, вы можете просто переслать нам список рейсов. Наш диспетчерский центр сам группирует гостей по Mercedes-Benz V-Class, отслеживает задержки рейсов в Мальпенсе и ведет единую ведомость.

Для больших групп мы также предоставляем комфортабельные минибусы от 16 до 50 мест. Если на ближайших датах потребуется поддержка с транспортом, напишите мне в WhatsApp или ответьте на это письмо.

{{signature}}

{{optout}}', false),
('T4_breakup', 'ru', 'sequence', 'Step 3 (Follow-up 2 · Финальное письмо)', 'Трансферы гостей: озеро Комо и Северная Италия', 'Трансферы гостей в Италии', '{{greeting}}

Пишу в последний раз, чтобы не перегружать вашу почту. Если для свадеб на озере Комо, в Милане или Северной Италии понадобится надежный транспорт для гостей, напишите мне в WhatsApp или ответьте на это письмо.

Успешного и спокойного сезона.

{{signature}}

{{optout}}', false),
('rate_card_delivery', 'ru', 'reply', 'Отправка тарифов (PDF)', '', '', '{{greeting}}

Во вложении направляю наш одностраничный партнерский лист тарифов и автопарк. Мы работаем как по конфиденциальным нетто-тарифам для вашей сметы, так и с 10% партнерской комиссией.

Если у вас запланирована дата и локация, пришлите ориентировочное число гостей, и я рассчитаю точный бюджет.

{{signature}}', true),
('rate_card_delivery', 'en', 'reply', 'Rate card delivery (attach PDF)', '', '', '{{greeting}}

Attached is our 1-page partner rate card and vehicle list. We work either on confidential net rates that you can include in your client offer, or on a 10% partner commission.

If you have an upcoming date and venue, send the guest count and I will put together a quote.

{{signature}}', true),
('rate_card_delivery', 'it', 'reply', 'Invio tariffa (PDF allegato)', '', '', '{{greeting}}

In allegato trovate il nostro listino partner di 1 pagina e la lista veicoli. Lavoriamo sia con tariffe nette riservate da includere nella vostra offerta, sia con una commissione partner del 10%.

Se avete una data e una location in programma, scrivetemi il numero di ospiti e preparo il preventivo.

{{signature}}', true),
('reply_asks_pricing', 'en', 'reply', 'Reply: asks for prices', '', '', '{{greeting}}

Our 1-page partner rate card is attached: a Mercedes-Benz V-Class from Malpensa to Como is €230 net (Bellagio €320 net), and our late-night villa shuttle is €450 net per V-Class (or we can work on a 10% partner commission).

Share your date, venue and guest count whenever you want a fixed quote.

{{signature}}', true),
('reply_asks_pricing', 'it', 'reply', 'Risposta: richiesta tariffe', '', '', '{{greeting}}

In allegato trovate il nostro listino partner di 1 pagina: una Mercedes-Benz Classe V da Malpensa a Como parte da €230 netti (Bellagio €320 netti) e il servizio navetta notturno dalle ville da €450 netti per Classe V (oppure con commissione partner del 10%).

Condividete pure data, location e numero di ospiti quando desiderate una quotazione dedicata.

{{signature}}', true),
('reply_asks_pricing', 'ru', 'reply', 'Ответ: запрос тарифов', '', '', '{{greeting}}

Во вложении наш одностраничный партнерский лист тарифов: Mercedes-Benz V-Class из Мальпенсы на Комо — €230 нетто (Белладжио — €320 нетто), ночной шаттл с вилл — €450 нетто за V-Class (также работаем с 10% партнерской комиссией).

Пришлите дату, виллу и количество гостей, когда потребуется точный расчет под проект.

{{signature}}', true),
('reply_meeting_request', 'en', 'reply', 'Reply: wants a call', '', '', '{{greeting}}

Happy to speak. I am free {{slot_1}} or {{slot_2}}, or send a time that suits you on WhatsApp.

{{signature}}', false),
('reply_has_supplier', 'en', 'reply', 'Reply: already has a supplier', '', '', '{{greeting}}

Understood, we are not looking to replace anyone you work with. I have attached our 1-page partner rate card and vehicle list (V-Classes, S-Classes and 16 to 50-seat minibuses) in case you ever need extra vehicles on a busy date.

{{signature}}', true),
('reply_not_now', 'en', 'reply', 'Reply: not now / next season', '', '', '{{greeting}}

Understood. I will check back before next season, and if a date comes up sooner, just reply here.

{{signature}}', false),
('reply_referral_to_other', 'en', 'reply', 'Reply: points to a colleague', '', '', '{{greeting}}

Thank you, I will write to {{referred_name}} directly and mention your note.

{{signature}}', false),
('ratecard_nudge', 'en', 'nudge', 'Nudge: rate card sent, no answer', '', '', '{{greeting}}

Quick check that our partner rate card reached you. If an upcoming wedding needs guest transfers or late-night returns, send me the date and venue for a quote.

{{signature}}', false),
('fam_followup', 'en', 'nudge', 'After a FAM transfer', '', '', '{{greeting}}

Thank you for riding with us. Let me know if there is anything you would tailor for your couples'' guests.

{{signature}}', false),
('reply_generic', 'en', 'reply', 'Reply: blank', '', '', '{{greeting}}

{{your_reply}}

{{signature}}', false)
on conflict (key, language) do nothing;

insert into public.prospects (type, agency_name, contact_name, source, review_source, rating, verified_reviews_count, location, segment, tags, notes, priority_score) values
('planner', 'WP Bellagio', null, 'matrimonio.com', 'matrimonio.com', '5', '27', 'Bellagio', 'boutique_local', array['seed','priority']::text[], null, '40'),
('planner', 'Federica Cantù Wedding Planner', null, 'matrimonio.com', 'matrimonio.com', '5', '41', null, 'boutique_local', array['seed','priority']::text[], null, '35'),
('planner', 'Como Luxury Wedding', null, 'matrimonio.com', 'matrimonio.com', '5', '11', null, 'boutique_local', array['seed','priority']::text[], null, '33'),
('planner', 'Perlee', null, 'matrimonio.com', 'matrimonio.com', '5', '26', null, 'boutique_local', array['seed','priority']::text[], null, '35'),
('planner', 'I Do in Lake Como', null, 'manual', 'google', null, null, null, 'boutique_local', array['seed','priority']::text[], 'Strong Google reviews (brief). Re-verify rating and count.', '21'),
('planner', 'SugarEvents', null, 'matrimonio.com', 'matrimonio.com', '4.9', '70', 'Laglio', 'boutique_local', array['seed','priority']::text[], 'Laglio / Milan.', '40'),
('planner', 'Best Day Ever', 'Barbara Botta', 'manual', null, null, null, null, null, array['seed']::text[], null, '20'),
('planner', 'Kiss & Escape', null, 'manual', null, null, null, null, null, array['seed']::text[], null, '16'),
('planner', 'Lena Freitag Weddings', null, 'manual', null, null, null, null, null, array['seed']::text[], null, '16'),
('planner', 'Romance in Italy', null, 'manual', null, null, null, null, null, array['seed']::text[], null, '16'),
('planner', 'Erika Romano Weddings', null, 'manual', null, null, null, null, null, array['seed']::text[], null, '16'),
('planner', 'Sabine Wedding Planner', null, 'manual', null, null, null, null, null, array['seed','unverified']::text[], 'Unverified in the brief: deprioritised.', '6'),
('venue', 'Relais Villa Vittoria', null, 'manual', null, null, null, 'Laglio', null, array['seed','backdoor']::text[], 'Venue with in-house event coordinator (referral backdoor).', '24'),
('venue', 'Villa Lario', null, 'manual', null, null, null, null, null, array['seed','backdoor']::text[], 'Written "Villa Larío" in the brief. Confirm the exact property.', '14'),
('venue', 'Filario', null, 'manual', null, null, null, 'Lezzeno', null, array['seed','backdoor']::text[], null, '19'),
('venue', 'Villa Cipressi', null, 'manual', null, null, null, 'Varenna', null, array['seed','backdoor']::text[], null, '24'),
('concierge_hotel', 'Grand Hotel Imperiale', null, 'manual', null, null, null, 'Moltrasio', null, array['seed','backdoor']::text[], null, '19'),
('planner', 'The Lake Como Wedding Planner', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '0'),
('planner', 'SposiamoVi', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '0'),
('planner', 'Eventoile', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '0'),
('planner', 'Elena Renzi', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '0'),
('planner', 'Matthew Oliver', null, 'manual', null, null, null, null, 'international', array['seed','tier1','low_priority']::text[], 'Tier 1/2 agency: judged saturated, kept for later.', '0');
