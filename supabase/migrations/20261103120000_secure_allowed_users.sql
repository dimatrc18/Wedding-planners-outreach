-- Security Update: Restrict allowed_users exclusively to authorized team members
-- Only traciuc04@gmail.com and dmitri.traciuc@gmail.com are permitted to access CRM data

delete from public.allowed_users where email not in ('dmitri.traciuc@gmail.com', 'traciuc04@gmail.com');

insert into public.allowed_users (email) values ('dmitri.traciuc@gmail.com')
on conflict (email) do nothing;

insert into public.allowed_users (email) values ('traciuc04@gmail.com')
on conflict (email) do nothing;
