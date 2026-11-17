-- Fleet Ledger Vehicles & Media Overrides (Partner Fleet & Rate Ledger)
-- Persists edits, added/deleted photos, custom vehicles, and archived (backup) vehicles.

create table if not exists public.fleet_ledger_vehicles (
  id text primary key,
  data jsonb not null,
  is_archived boolean not null default false,
  archived_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists idx_fleet_ledger_vehicles_archived
  on public.fleet_ledger_vehicles (is_archived);

alter table public.fleet_ledger_vehicles enable row level security;

create policy "allowed users manage fleet_ledger_vehicles" on public.fleet_ledger_vehicles
  for all to authenticated using (public.is_allowed()) with check (public.is_allowed());

create policy "anon read fleet_ledger_vehicles" on public.fleet_ledger_vehicles
  for select to anon using (true);
