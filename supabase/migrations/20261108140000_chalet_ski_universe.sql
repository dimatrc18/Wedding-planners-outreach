-- Dedicated isolated market discovery table for Alpine Luxury Chalet Brokers & Boutique Ski Tour Operators.
-- Completely isolated from core wedding prospects and bus partners to prevent any dashboard or CRM regressions.

create table if not exists public.chalet_ski_universe (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  category text not null check (category in ('Chalet_Broker', 'Boutique_Ski_Tour_Operator')),
  website text not null,
  hq_country text not null,
  hq_city text not null,
  key_resorts text[] not null default '{}',
  relevance_score integer not null check (relevance_score >= 70 and relevance_score <= 100),
  tier text not null check (tier in ('Tier_1_Core_90_100', 'Tier_2_High_80_89', 'Tier_3_Moderate_70_79')),
  score_rationale text not null,
  contact_email text,
  contact_phone_whatsapp text,
  decision_maker_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chalet_ski_score on public.chalet_ski_universe (relevance_score desc);
create index if not exists idx_chalet_ski_tier on public.chalet_ski_universe (tier);
create index if not exists idx_chalet_ski_category on public.chalet_ski_universe (category);
create index if not exists idx_chalet_ski_country on public.chalet_ski_universe (hq_country);

alter table public.chalet_ski_universe enable row level security;

create policy "allow_all_chalet_ski_universe" on public.chalet_ski_universe
  for all using (true) with check (true);
