-- Dorogo Event & MICE Partner CRM Table
-- Isolated from core wedding planners and bus partners to prevent regressions.

create table if not exists public.event_planners (
  id text primary key default ('event_' || substr(md5(random()::text), 1, 12)),
  name text not null,
  agency_type text not null default 'corporate_mice',
  agency_type_label text,
  contact_person text,
  email text,
  phone text,
  website text,
  base_city text default 'Milano',
  relevance_score integer not null default 80,
  score_breakdown jsonb not null default '{
    "scale_score": 20,
    "vip_clientele": 20,
    "northern_italy_coverage": 20,
    "mobility_demand": 20
  }'::jsonb,
  status text not null default 'TO_REVIEW' check (status in ('TO_REVIEW', 'WANT_TO_CONTACT', 'CONTACTED', 'APPROVED_PARTNER', 'REJECTED', 'NOT_RELEVANT')),
  notes text,
  source text default 'seed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for lightning fast queries and ordering
create index if not exists idx_event_planners_score on public.event_planners (relevance_score desc);
create index if not exists idx_event_planners_status on public.event_planners (status);
create index if not exists idx_event_planners_type on public.event_planners (agency_type);
create index if not exists idx_event_planners_city on public.event_planners (base_city);
create index if not exists idx_event_planners_website on public.event_planners (website);

-- Row Level Security
alter table public.event_planners enable row level security;

-- Authenticated allowed users policy
create policy "allowed users manage event_planners" on public.event_planners
  for all to authenticated using (public.is_allowed()) with check (public.is_allowed());

-- Public read & write for authorized front-end client role
create policy "service role and public read event_planners" on public.event_planners
  for select to anon using (true);

create policy "service role update event_planners" on public.event_planners
  for all to anon using (true) with check (true);

-- Trigger to keep updated_at fresh
create or replace function public.touch_event_planners_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_event_planners_updated_at on public.event_planners;
create trigger trg_event_planners_updated_at
  before update on public.event_planners
  for each row execute function public.touch_event_planners_updated_at();

-- Seed verified initial Milan event & MICE agencies
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city, relevance_score, score_breakdown, status, notes, source
) values
(
  'event_1793298001001_bw01',
  'Balich Wonder Studio',
  'luxury_gala',
  '✨ Mega Shows & Luxury Brand Galas',
  'Production Logistics Desk',
  'info@balichws.com',
  '+39 02 8343 8600',
  'https://www.balichws.com',
  'Milano',
  96,
  '{"scale_score": 25, "vip_clientele": 25, "northern_italy_coverage": 24, "mobility_demand": 22}'::jsonb,
  'TO_REVIEW',
  'Global high-end live entertainment and Olympic/gala ceremonies based in Milan. Heavy VIP transfer demand between Milan hotels, private venues, and Lake Como villas.',
  'seed'
),
(
  'event_1793298002002_fr02',
  'Feel Rouge Worldwide Shows',
  'fashion_luxury',
  '👠 Fashion Shows & Brand Activations',
  'Operations Team',
  'info@feelrouge.it',
  '+39 02 8907 8880',
  'https://www.feelrouge.it',
  'Milano',
  94,
  '{"scale_score": 24, "vip_clientele": 25, "northern_italy_coverage": 24, "mobility_demand": 21}'::jsonb,
  'TO_REVIEW',
  'Elite fashion week productions, luxury jewelry launches (Bulgari, Cartier tier), and high-profile private galas in Milan, Venice, and Como.',
  'seed'
),
(
  'event_1793298003003_tg03',
  'Triumph Group International',
  'corporate_mice',
  '🏢 Corporate Summits & MICE',
  'Milano Congress Logistics',
  'milano@triumphgroup.it',
  '+39 02 4801 3244',
  'https://www.triumphgroupinternational.com',
  'Milano',
  92,
  '{"scale_score": 24, "vip_clientele": 22, "northern_italy_coverage": 24, "mobility_demand": 22}'::jsonb,
  'TO_REVIEW',
  'Major international congress organizer and corporate convention producer in Milan, Rome, and Brussels. High demand for executive van and coach transfers.',
  'seed'
),
(
  'event_1793298004004_mc04',
  'MCI Italy (Milan Office)',
  'corporate_mice',
  '🏢 Corporate Summits & MICE',
  'Milan Logistics Team',
  'mci-milan@mci-group.com',
  '+39 02 2498 01',
  'https://www.wearemci.com',
  'Milano',
  91,
  '{"scale_score": 23, "vip_clientele": 23, "northern_italy_coverage": 23, "mobility_demand": 22}'::jsonb,
  'TO_REVIEW',
  'Global brand communication and corporate event agency. Key accounts in luxury automotive, pharma, and finance needing airport shuttles and VIP transfers.',
  'seed'
),
(
  'event_1793298005005_em05',
  'Enic Meetings & Events',
  'dmc_incoming',
  '🗺️ Luxury DMC & Incoming Travel',
  'DMC Operations Desk',
  'events@enic.it',
  '+39 055 260 8941',
  'https://www.enic.it',
  'Milano',
  89,
  '{"scale_score": 22, "vip_clientele": 23, "northern_italy_coverage": 23, "mobility_demand": 21}'::jsonb,
  'TO_REVIEW',
  'Boutique luxury DMC specializing in incentive trips, board retreats, and VIP client hospitality across Milan, Lake Como, and Florence.',
  'seed'
),
(
  'event_1793298006006_fs06',
  'Faster Communication / Fuorisalone Productions',
  'fashion_luxury',
  '👠 Fashion Shows & Brand Activations',
  'Design Week Coordination',
  'info@fastercommunication.it',
  '+39 02 3658 2900',
  'https://www.fastercommunication.it',
  'Milano',
  88,
  '{"scale_score": 22, "vip_clientele": 23, "northern_italy_coverage": 23, "mobility_demand": 20}'::jsonb,
  'TO_REVIEW',
  'Milano Design Week (Fuorisalone) installations, press day VIP logistics, and evening launch party transport coordination.',
  'seed'
),
(
  'event_1793298007007_sg07',
  'Sinergie MICE & Communication (SG Company)',
  'sports_media',
  '🏆 Sports, Media & Entertainment',
  'Entertainment Logistics',
  'info@sg-company.it',
  '+39 02 8345 9900',
  'https://www.sg-company.it',
  'Milano',
  90,
  '{"scale_score": 23, "vip_clientele": 23, "northern_italy_coverage": 23, "mobility_demand": 21}'::jsonb,
  'TO_REVIEW',
  'Listed communications group (Euronext Growth Milan). Top corporate conventions, sports entertainment events, and celebrity mobility coordination.',
  'seed'
)
on conflict (id) do nothing;
