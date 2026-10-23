-- Dorogo Luxury Bus & Minibus Partner CRM Table
-- Isolated from core wedding planners and leads to prevent any regressions.

create table if not exists public.bus_partners (
  id text primary key default ('partner_' || substr(md5(random()::text), 1, 12)),
  name text not null,
  base_city text,
  website text,
  fleet_url text,
  relevance_score integer not null default 0,
  score_breakdown jsonb not null default '{
    "discretion_unbranded": 20,
    "fleet_luxury": 18,
    "territory_permits": 15,
    "corporate_sla": 15
  }'::jsonb,
  status text not null default 'TO_REVIEW' check (status in ('TO_REVIEW', 'WANT_TO_CONTACT', 'VETTED', 'CONTACTED', 'APPROVED_PARTNER', 'REJECTED', 'NOT_RELEVANT')),
  unbranded_status text,
  fleet_categories jsonb not null default '[]'::jsonb,
  phone text,
  email text,
  notes text,
  source text default 'crawler',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for lightning fast queries and ordering
create index if not exists idx_bus_partners_score on public.bus_partners (relevance_score desc);
create index if not exists idx_bus_partners_status on public.bus_partners (status);
create index if not exists idx_bus_partners_city on public.bus_partners (base_city);
create index if not exists idx_bus_partners_website on public.bus_partners (website);

-- Row Level Security
alter table public.bus_partners enable row level security;

-- Authenticated allowed users policy
create policy "allowed users manage bus_partners" on public.bus_partners
  for all to authenticated using (public.is_allowed()) with check (public.is_allowed());

-- Public read for authorized front-end client role
create policy "service role and public read bus_partners" on public.bus_partners
  for select to anon using (true);

create policy "service role update bus_partners" on public.bus_partners
  for all to anon using (true) with check (true);

-- Trigger to keep updated_at fresh
create or replace function public.touch_bus_partners_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bus_partners_updated_at on public.bus_partners;
create trigger trg_bus_partners_updated_at
  before update on public.bus_partners
  for each row execute function public.touch_bus_partners_updated_at();

-- Seed initial 8 verified Northern Italy luxury bus partners
insert into public.bus_partners (
  id, name, base_city, website, fleet_url, relevance_score, score_breakdown, status, unbranded_status, fleet_categories, phone, email, notes, source
) values
(
  'partner_moveolux',
  'Moveolux',
  'Milano',
  'https://www.moveolux.com',
  'https://www.moveolux.com/fleet/luxury-bus-hire/',
  98,
  '{"discretion_unbranded": 35, "fleet_luxury": 25, "territory_permits": 20, "corporate_sla": 18}'::jsonb,
  'VETTED',
  '100% Guaranteed Unbranded / Total Black',
  '["Limobus Exclusive (18-28 seats)", "Mercedes Sprinter VIP (8-16 seats)", "Setra VIP Lounge"]'::jsonb,
  '+39 02 4004 7799',
  'booking@moveolux.com',
  'Pioneer of Limobus. Lounge seating, bar, hostess, champagne service. Highest price in Italy, but gold standard for ultra-VIP.',
  'seed'
),
(
  'partner_vip_limousine',
  'VIP Limousine Milan',
  'Milano',
  'https://www.viplimousine.it',
  'https://www.car-rental-with-driver.com/en/services/luxury-coach-and-minibus-rental-with-driver-milan.html',
  94,
  '{"discretion_unbranded": 35, "fleet_luxury": 22, "territory_permits": 20, "corporate_sla": 17}'::jsonb,
  'VETTED',
  '100% Guaranteed Unbranded / NCC Black',
  '["Mercedes Sprinter Luxury (8-20 seats)", "Executive Coaches (21, 28, 30, 56, 64 seats)"]'::jsonb,
  '+39 02 546 5555',
  'info@viplimousine.it',
  'Replaces vehicles every 2 years / 20k km. Strictly unbranded black/dark grey fleet. Suited chauffeurs, 24/7 central dispatch.',
  'seed'
),
(
  'partner_transervice',
  'Transervice Limousine',
  'Milano',
  'https://www.transervicelimousine.com',
  'https://www.transervicelimousine.com/',
  91,
  '{"discretion_unbranded": 35, "fleet_luxury": 20, "territory_permits": 18, "corporate_sla": 18}'::jsonb,
  'VETTED',
  '100% Guaranteed Unbranded',
  '["Mercedes Sprinter Executive (16-19 seats)", "Setra TopClass VIP Coaches (30-50 seats)"]'::jsonb,
  '+39 02 8951 6852',
  'info@transervicelimousine.com',
  'Diplomatic and VIP FBO (Linate Prime) specialists. Dark monochromatic vehicles with zero company decals.',
  'seed'
),
(
  'partner_cima_luxury',
  'Cima Luxury',
  'Milano',
  'https://cimaluxury.com',
  'https://cimaluxury.com/',
  86,
  '{"discretion_unbranded": 32, "fleet_luxury": 22, "territory_permits": 16, "corporate_sla": 16}'::jsonb,
  'TO_REVIEW',
  'Unbranded Luxury Line',
  '["Mercedes Sprinter VIP Lounge", "Executive Minicoaches"]'::jsonb,
  '+39 02 3656 4050',
  'info@cimaluxury.com',
  'Concierge and luxury mobility fleet. High-end leather interiors, privacy tinting.',
  'seed'
),
(
  'partner_perletti_topclass',
  'Perletti Autoservizi (Top Class Line)',
  'Bergamo / Milano',
  'https://www.perlettibus.it',
  'https://www.perlettibus.it/flotta/',
  81,
  '{"discretion_unbranded": 25, "fleet_luxury": 22, "territory_permits": 18, "corporate_sla": 16}'::jsonb,
  'TO_REVIEW',
  'Unbranded on Request (Specify Top Class)',
  '["Setra TopClass 515/516 HD (30-54 seats)", "Mercedes Tourismo Black Series", "Mercedes Sprinter Minibus"]'::jsonb,
  '+39 035 830 148',
  'info@perlettibus.it',
  'Large fleet. Must specify Top Class / Senza Livrea in booking notes to guarantee unbranded dark vehicle.',
  'seed'
),
(
  'partner_lariobus',
  'Lariobus',
  'Lecco (Lake Como)',
  'https://www.lariobus.com',
  'https://www.lariobus.com/flotta/',
  79,
  '{"discretion_unbranded": 20, "fleet_luxury": 20, "territory_permits": 20, "corporate_sla": 19}'::jsonb,
  'TO_REVIEW',
  'Unbranded on Request (Must Demand in Quote)',
  '["Midi-coaches 13-30 seats", "GT Coaches 36-56 seats"]'::jsonb,
  '+39 0341 581 600',
  'info@lariobus.com',
  'Best local driver knowledge for Lake Como villas (Villa d''Este, Balbianello). Must request unbranded coach without decals.',
  'seed'
),
(
  'partner_linea_azzurra',
  'Linea Azzurra Bus',
  'Milano / Monza',
  'https://www.lineaazzurrabus.com',
  'https://www.lineaazzurrabus.com/la-nostra-flotta/',
  70,
  '{"discretion_unbranded": 15, "fleet_luxury": 20, "territory_permits": 18, "corporate_sla": 17}'::jsonb,
  'TO_REVIEW',
  'Neutral White / Custom B2B Fleet',
  '["Setra & Mercedes Coaches 30-75 seats"]'::jsonb,
  '+39 02 905 5406',
  'info@lineaazzurrabus.com',
  'Mass capacity operator for Fiera Milano Rho & corporate conventions. Modern Euro 6 fleet, good for large congress shuttles.',
  'seed'
),
(
  'partner_rosa_bus',
  'Rosa Bus',
  'Milano / Brianza',
  'https://www.rosabus.it',
  'https://www.rosabus.it/flotta/',
  68,
  '{"discretion_unbranded": 15, "fleet_luxury": 18, "territory_permits": 18, "corporate_sla": 17}'::jsonb,
  'TO_REVIEW',
  'Standard Tour Livery (Needs Request for Plain)',
  '["Mercedes Tourismo 30-53 seats"]'::jsonb,
  '+39 039 601 2284',
  'info@rosabus.it',
  'Reliable Mercedes fleet for regional transfers, Monza F1, and airport groups.',
  'seed'
)
on conflict (id) do update set
  relevance_score = excluded.relevance_score,
  score_breakdown = excluded.score_breakdown,
  fleet_categories = excluded.fleet_categories,
  notes = excluded.notes,
  updated_at = now();
