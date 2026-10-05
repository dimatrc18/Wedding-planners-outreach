-- Only emails listed here can read or write. Add the project owner's email too.
create table public.allowed_users (
  email text primary key
);
insert into public.allowed_users (email) values ('christopher.debatin@tern-group.com');
insert into public.allowed_users (email) values ('dmitri.traciuc@gmail.com');

create table public.planners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  studio text,
  city text,
  email text,
  instagram text,
  status text not null default 'new' check (status in ('new','contacted','replied','booked')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.allowed_users enable row level security;
alter table public.planners enable row level security;

create function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where email = (auth.jwt() ->> 'email'));
$$;

create policy "allowed users manage planners" on public.planners
  for all to authenticated using (public.is_allowed()) with check (public.is_allowed());
