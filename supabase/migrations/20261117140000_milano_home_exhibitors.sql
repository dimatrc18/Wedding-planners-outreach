-- Milano Home 2027: Add dual-sender & scheduling columns and seed all 84 foreign exhibitors

alter table public.event_planners add column if not exists sender_email text default 'igor@b2b-dorogo.it';
alter table public.event_planners add column if not exists country text;
alter table public.event_planners add column if not exists hall_booth text;
alter table public.event_planners add column if not exists fair_event text default 'Milano Home 2027';
alter table public.event_planners add column if not exists region_group text;
alter table public.event_planners add column if not exists origin_hub text;
alter table public.event_planners add column if not exists is_enriched boolean default false;
alter table public.event_planners add column if not exists sent_at timestamptz;
alter table public.event_planners add column if not exists followup_sent_at timestamptz;
alter table public.event_planners add column if not exists sent_message_id text;
alter table public.event_planners add column if not exists custom_subject text;
alter table public.event_planners add column if not exists custom_body text;

create index if not exists idx_event_planners_sender_email on public.event_planners (sender_email);

insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_001', 'ADDISON ROSS LTD', 'tier1_luxury', '🇬🇧 Exhibiting Team · United Kingdom', 'Henry Holdsworth', 'h.holdsworth@addison-ross.com', '0044 1668212199', 'https://www.addisonross.com', 'WOOLER INDUSTRIAL ESTATE BERWICK RD WOOLER, NORTHUMBERLAND, United Kingdom of Great Britain and Northern Ireland',
  95, 'WANT_TO_CONTACT', 'Addison Ross is a family-owned and run business with a commitment to quality at its core. Each product is designed to give a timeless feel and last a lifetime. The brand’s mission is to help customers...', 'milano_home_2027', 'dmitri@dorogo.eu', 'United Kingdom', 'a4bTk000000TAGvIAO', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_002', 'AMBIENTE EUROPE B.V.', 'tier1_luxury', '🇳🇱 Exhibiting Team · Netherlands', 'Yuri van Erp', 'y.vanerp@ambiente.eu', '+31 24 357 04 42', 'http://www.ambiente.eu', 'Beugen, Netherlands',
  94, 'WANT_TO_CONTACT', 'Ambiente Europe is a leading Dutch brand renowned for its beautifully designed paper napkins and coordinated tableware collections. With over 240 seasonal designs, Ambiente brings style and inspiratio...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Netherlands', 'a4bTk000000TvkTIAS', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_003', 'AME GONZÁLEZ PAPETERIE', 'foreign_exhibitor', '🇩🇪 Exhibiting Team · Germany', 'Amellali González König', 'contact@ame-gonzalez.com', '+49 155 62262311', 'https://ame-gonzalez.com', 'Berlin, Germany',
  90, 'WANT_TO_CONTACT', 'Ame González Papeterie is a Berlin-based stationary brand. My creations are carefully designed by hand with paint, giving them a unique and beautiful quality. I use symbols, but no words to communicat...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000Vd1tIAC', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_004', 'AND NOOK B.V.', 'foreign_exhibitor', '🇳🇱 Exhibiting Team · Netherlands', 'Jesse de Vries', 'jesse@andnook.com', '+31 575 743 000', 'https://andnook.com/', 'Zutphen, Netherlands',
  92, 'WANT_TO_CONTACT', 'We are And Nook, a Dutch home & living brand with a mission to bring colour, joy and personality to every nook of the home.

 From our creative studio in the Netherlands, we design collections filled ...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Netherlands', 'a4bTk000000YqU1IAK', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_005', 'ARTE FINO S.L.', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Artefinomed', 'artefinomed@yahoo.es', '0034 642763163', 'https://WWW.ARTE-FINO.COM', 'AVENIDA AZAGADOR DE LA TORRE 67B, VALENCIA, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000TcRhIAK', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_006', 'ARTECER ARTESANIA S.L.', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Artecer', 'artecer@hotmail.com', '0034955631768', 'http://www.artecer.es', 'POLIGONO INDUSTRIAL CALLE 6, PARCELA 93, ALCALA'' DE GUADAIRA SEVILLA, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000ZrsfIAC', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_007', 'ARTITREE GMBH', 'foreign_exhibitor', '🇩🇪 Exhibiting Team · Germany', 'Jan Götte', 'jan.goette@artitree.de', '+49 2153 958 90', 'https://artitree.com', 'Nettetal, Germany',
  93, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Germany.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000WdPdIAK', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_008', 'BADEN GmbH', 'foreign_exhibitor', '🇩🇪 Exhibiting Team · Germany', 'Baden Collection Team', 'info@baden-collection.de', '+49 4263 98536', 'http://www.baden-collection.de', 'Scheeßel, Germany',
  91, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Germany.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000TvR8IAK', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_009', 'BATELA 1991, S.L.', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Batela Team', 'info@batela.com', '+34 943 140 945', 'http://www.batela.com', 'Getaria, Gipuzkoa, Spain',
  91, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000TvnhIAC', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_010', 'BIG PANDA', 'foreign_exhibitor', '🇧🇪 Exhibiting Team · Belgium', 'Martin', 'martin@bigpanda.be', '+32 499 35 23 35', 'https://WWW.BIGPANDAB2B.COM', '29 RUE DES RÉLIS NAMURWÈS, NAMUR, Belgium',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Belgium.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Belgium', 'a4bTk000000Tw8fIAC', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_011', 'BREDOUILLE', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Bonjour', 'bonjour@varek.fr', '0033 6 12 93 05 25', 'https://illustrations.varek.fr/', '72 CHEMIN DE BOUGAINVILLE, LES PORTES EN RE, France',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'dmitri@dorogo.eu', 'France', 'a4bTk000000TAgjIAG', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_012', 'CANDLE WAND', 'foreign_exhibitor', '🇯🇵 Exhibiting Team · Japan', 'Fusako Miyakawa', 'fusako.miyakawa@gmail.com', '3358013739', 'https://candle-wand.com/en/', '2-13-9 ASAKUSABASHI TAITO-KU, TOKYO, Japan',
  85, 'WANT_TO_CONTACT', 'CANDLE WAND is a brand born with the concept of a “magic wand” that makes the moment you light a candle a special time.

 From a lighter that you keep in a drawer to a lighter that can be used as an i...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Japan', 'a4bTk000000VbBNIA0', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_013', 'CERERIA MOLLA'' 1899', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Cereriamolla', 'cereriamolla@cdbranding.it', '', 'https://www.cereriamolla.com/', 'C/ BUFALI 32 APDO. 104, ALBAIDA VALENCIA, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000TAwrIAG', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_014', 'CLAYRE & EEF B.V.', 'foreign_exhibitor', '🇳🇱 Exhibiting Team · Netherlands', 'Clayre & Eef Team', 'info@clayre-eef.com', '+31 475 571 722', 'http://www.clayre-eef.com', 'Haelen, Netherlands',
  95, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Netherlands.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Netherlands', 'a4bTk000000YrgDIAS', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_015', 'COLLEGIEN', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Mcr Guille', 'mcr.guille@gmail.com', '0033617245276', 'https://www.collegien-shop.fr', '4 RUE DE LA BONNETERIE, BRIATEXTE, France',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'dmitri@dorogo.eu', 'France', 'a4bTk000000ZVIfIAO', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_016', 'CORSTON LTD', 'tier1_luxury', '🇬🇧 Exhibiting Team · United Kingdom', 'Brian Ennis', 'brian.ennis@corston.com', '00390645258600', 'https://www.corston.eu/it-it', 'BREMHILL HOUSE, BREMHILL, CALNE WILTSHIRE, United Kingdom of Great Britain and Northern Ireland',
  95, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from United Kingdom.', 'milano_home_2027', 'dmitri@dorogo.eu', 'United Kingdom', 'a4bTk000000YPlZIAW', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_017', 'COULEUR NATURE', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Bruno Lamy', 'bonjour@couleurnature.com', '0033 663 755 120', 'https://couleurnature.com', 'Paris, France',
  92, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'dmitri@dorogo.eu', 'France', 'a4bTk000000WfsrIAC', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_018', 'Crafts Shizuoka', 'foreign_exhibitor', '🇯🇵 Exhibiting Team · Japan', 'Atelier Su', 'atelier.su@nifty.com', '0081 ( 0)54 340 0349', 'https://ateliersu-shop.com', '1-32-16-307, SENAGAWA, AOI-KU, SHIZUOKA CITY, Japan',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Japan.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Japan', 'a4bTk000000XqcXIAS', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_019', 'DONGGUAN YUNYU HOUSEHOLD PRODUCT CO. LTD.', 'foreign_exhibitor', '🇨🇳 Exhibiting Team · China', 'Yana', 'yana@maoyuanxianga.com', '+86 13689588153', '', '1/F, NO.53, NANLING ROAD, NANA VILL. GROUP,YOUGANPU VILL., FENGGANG TOWN, DONGGUAN, GUANGDONG, China',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from China.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'China', 'a4bTk000000UpI1IAK', 'Milano Home 2027', 'rest_world', NULL, false
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_020', 'ESERVICE MANUTENZIONE', 'foreign_exhibitor', '🇺🇸 Exhibiting Team · United States', 'Eservice Marketing', 'eservice.marketing@fieramilano.it', '', '', 'SS DEL SEMPIONE, NEW YORK, United States of America',
  85, 'NOT_RELEVANT', 'Internal Fiera Milano service maintenance staff. Not an international exhibiting team.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'United States', 'Hall 6 - a4bTk000000SkRJIA0', 'Milano Home 2027', 'rest_world', NULL, false
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_021', 'ESTER & ERIK A/S', 'tier1_luxury', '🇩🇰 Exhibiting Team · Denmark', 'Sm', 'sm@ester-erik.dk', '004586816211', 'http://www.ester-erik.dk', 'BERGSOESVEJ 23, SILKEBORG, Denmark',
  95, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Denmark.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Denmark', 'a4bTk000000T9uLIAS', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_022', 'ESTIA HOME ART S.A.', 'foreign_exhibitor', '🇬🇷 Exhibiting Team · Greece', 'Exports', 'exports@estiahomeart.gr', '0030 2169001064', 'https://estiahomeart.com/', 'PARODOS ANAGENNISEOS & KALYPSO,  THESSI NTRASSARIAS, ASPROPYRGOS, Greece',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Greece.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Greece', 'a4bTk000000ZZ1JIAW', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_023', 'EXCLUSIVA HOME TRADE SL', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Trade Fair Desk', 'fuenlabrada@zhyt0218.com', '', '', 'CALLE RIO TORMES 11, MADRID, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'Hall 6 - a4bTk000000YH6TIAW', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_024', 'FAYE SAS', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Ventes', 'ventes@faye-sas.fr', '0033 556955252', 'http://www.efya-deco.com', '4 RUE FRANCOIS COLI, BLANQUEFORT, France',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'dmitri@dorogo.eu', 'France', 'a4bTk000000TxJFIA0', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_025', 'FOIMPEX SL', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Lourdes Alsina', 'lourdes.alsina@foimpex.es', '+ 34 93 296 8882', 'https://foimpex.com.es/en/home-en', 'CROM 25, CORNELLÁ DE LLOBREGAT, BARCELONA,, BARCELONA, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000ZiXdIAK', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_026', 'FONDERIE SAINT LUC', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Johann', 'contact@fonderie-st-luc.com', '+33 6 99 67 86 45', 'https://fonderie-st-luc.com', 'Gigean, France',
  90, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'dmitri@dorogo.eu', 'France', 'Hall 6 - a4bTk000000ZRi5IAG', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_027', 'FUTURE TELECOM PLUS S.L', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Digitalitalia Amministrazione', 'digitalitalia.amministrazione@gmail.com', '', '', 'CALLE CARPINTEROS 12, GETAFE MADRID, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000UIvZIAW', 'Milano Home 2027', 'france_spain', NULL, false
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_028', 'GARPE - ETHAN CHLOE', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Trade & Contract Sales Desk', 'garpe@garpeinteriores.com', '+34 925 805 812', 'https://www.garpeinteriores.com/', 'Talavera de la Reina, Toledo, Spain',
  90, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000ZYzhIAG', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_029', 'GEA BARCELONA', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Josep Barrena Gea', 'josep.barrena.gea@gmail.com', '0034 934099225', 'https://geabarcelona.com/', 'CARRER DEL COBALT 74, L''HOSPITALET DE LLOBREGAT, Spain',
  85, 'WANT_TO_CONTACT', 'Gea Barcelona is a leading wholesale supplier in the international distribution of high-quality minerals, crystals, and fossils. From our facilities in Barcelona, we offer an exclusive and carefully c...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'Hall 6 - a4bTk000000X0hBIAS', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_030', 'GEFU GMBH', 'tier1_luxury', '🇩🇪 Exhibiting Team · Germany', 'L Knoche', 'l.knoche@gefu.com', '0049 297971362', 'https://www.gefu.com/', 'BRAUKWEG 28, ESLOHE, Germany',
  95, 'WANT_TO_CONTACT', 'Brands provide orientation, create identity and set welcome markers which consumers can trust in the storm of communication experienced in an increasingly digitised world.

This applies to the GEFU br...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000Tc6jIAC', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_031', 'GILDE HANDWERK Macrander GmbH & Co. KG', 'foreign_exhibitor', '🇩🇪 Exhibiting Team · Germany', 'Gilde Handwerk Team', 'export@gildehandwerk.com', '+49 2871 1880', 'http://www.gildehandwerk.com', 'Bocholt, Germany',
  94, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Germany.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000ZK2HIAW', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_032', 'GRY &amp; SIF', 'foreign_exhibitor', '🇩🇰 Exhibiting Team · Denmark', 'Christina', 'christina@gryandsif.com', '+45 70203118', 'https://www.gryandsif.com', 'SOGADE 16, RINGSTED, Denmark',
  85, 'WANT_TO_CONTACT', 'At Gry & Sif, the magic unfolds through our felted creations, handcrafted by skilled Nepalese artisans. We celebrate thoughtful craftsmanship and cherish the unique charm born from the hands of true m...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Denmark', 'a4bTk000000TtPJIA0', 'Milano Home 2027', 'uk_north', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_033', 'HEGA HOGAR', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Hega Hogar Team', 'info@hegahogar.com', '+34 966 550 452', 'https://www.hegahogar.com', 'Ibi, Alicante, Spain',
  90, 'WANT_TO_CONTACT', 'HEGA HOGAR: Functional Design for Your Everyday Life

 At HEGA HOGAR, we mould plastic with innovation and style to create modern kitchenware, storage and cleaning items that transform your home. Our ...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'Hall 6 - a4bTk000000Toe9IAC', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_034', 'HENRIETTE - Gruppo Marino Cristal S.p.A.', 'foreign_exhibitor', '🇸🇲 Exhibiting Team · San Marino', 'Commerciale', 'commerciale@marinocristal.com', '0549904062', 'https://www.henriette.sm/', 'VIA GUARDA DEL CONSIGLIO 31, SERRAVALLE, San Marino',
  85, 'WANT_TO_CONTACT', 'Il marchio Henriette nasce nel 1996 ereditando la decennale tradizione del comparto produttivo di un’azienda sammarinese leader nella decorazione artistica della porcellana.
 Grazie all’esperienza e l...', 'milano_home_2027', 'dmitri@dorogo.eu', 'San Marino', 'a4bTk000000TsRdIAK', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_035', 'HOFF-INTERIEUR GmbH &amp; Co. KG', 'foreign_exhibitor', '🇩🇪 Exhibiting Team · Germany', 'Hoff-Interieur Team', 'info@hoff-interieur.de', '+49 911 930600', 'http://www.hoff-interieur.de', 'Nürnberg, Germany',
  92, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Germany.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000TGhKIAW', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_036', 'HOME SOCIETY BV', 'foreign_exhibitor', '🇳🇱 Exhibiting Team · Netherlands', 'Dolf', 'dolf@homesociety.nl', '0031 252 760760', 'https://www.homesociety.nl', '1E POELLAAN 6, LISSE, Netherlands',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Netherlands.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Netherlands', 'a4bTk000000URqnIAG', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_037', 'HORL 1993 GmbH', 'tier1_luxury', '🇩🇪 Exhibiting Team · Germany', 'HORL Team', 'info@horl.com', '0049 761 888 723 00', 'https://www.horl.com', 'ZOLLHALLENSTR. 13, FREIBURG IM BREISGAU, Germany',
  95, 'WANT_TO_CONTACT', 'MORE POSSIBILITIES. MORE SHARPNESS.
The HORL®2 sharpener offers maximum versatility to satisfy individual requirements. With interchangeable grinding wheels, a 15° grinding angle for filigree and 20° ...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000TAjxIAG', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_038', 'IBESI IBERICA SL', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Trade Fair Desk', 'info@ibesi.es', '3465025255', '', 'CALLE TORENO 46, FUENLABRADA, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000W1VdIAK', 'Milano Home 2027', 'france_spain', NULL, false
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_039', 'IMBARRO HOME & FASHION B.V.', 'foreign_exhibitor', '🇳🇱 Exhibiting Team · Netherlands', 'Wouter', 'wouter@imbarro.nl', '', 'https://www.imbarro.nl', 'SIPPENBROEK 32, ZUTPHEN, Netherlands',
  85, 'WANT_TO_CONTACT', 'Imbarro is an unique Dutch brand for interior and fashion accessories. Several times a year and with love and care, Imbarro surprises their clients with new collections of home and fashion accessories...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Netherlands', 'a4bTk000000TzmTIAS', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_040', 'JGS Home', 'foreign_exhibitor', '🇵🇱 Exhibiting Team · Poland', 'Marriusz Wilk', 'marriusz.wilk@gmail.com', '0048510607766', 'http://www.jgshome.pl', 'UL. JAWOROWA 13, MILEJOWICE, Poland',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Poland.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Poland', 'a4bTk000000XxirIAC', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_041', 'JILIN XINSILU HANDICRAFT DEVELOPMENT CO. LTD.', 'foreign_exhibitor', '🇨🇳 Exhibiting Team · China', 'Frank', 'frank@xinsilu-handicraft.com', '0086 13944239160', 'https://xinsilufrank.en.alibaba.com/?spm=a2700.micro_cgs_home.0.0.699a3e5f6snafP', 'NO. 373, JIHUA ROAD, YONGJI ECONOMIC DEVELOPMENT ZONE, JILIN, China',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from China.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'China', 'a4bTk000000ZJpNIAW', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_042', 'KIKKERLAND EUROPE BV', 'tier1_luxury', '🇳🇱 Exhibiting Team · Netherlands', 'Europe', 'europe@kikkerland.com', '0031 108208511', 'https://WWW.KIKKERLAND.COM', 'PO BOX 30240, ROTTERDAM, Netherlands',
  95, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Netherlands.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Netherlands', 'a4bTk000000T6A5IAK', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_043', 'KLEEN-TEX INDUSTRIES GMBH', 'foreign_exhibitor', '🇦🇹 Exhibiting Team · Austria', 'Kleen-Tex Team', 'info@kleen-tex.eu', '+43 5372 61380', 'https://www.kleen-tex.eu', 'Ebbs, Austria',
  90, 'WANT_TO_CONTACT', 'Kleen-Tex Industries GmbH is a worldwide renowned mat manufacturer and is one of the leading companies in Europe. This leading position has been gained by means of our three plants located in Austria,...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Austria', 'a4bTk000000URsPIAW', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_044', 'KLIPPAN YLLEFABRIK AB', 'foreign_exhibitor', '🇸🇪 Exhibiting Team · Sweden', 'Pernilla', 'pernilla@klippanyllefabrik.se', '00 46 43544 88 80', 'https://klippanyllefabrik.com/', 'JÄRNVÄGSGATAN 21, KLIPPAN, Sweden',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Sweden.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Sweden', 'a4bTk000000Xn5BIAS', 'Milano Home 2027', 'uk_north', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_045', 'LLINARES IMPORT SL', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Llinares', 'llinares@llinaresimport.com', '0034935643348', 'http://www.carlaworld.com', 'NARCIS MONTURIOL 17-19, POL. IND. FOINVASA, MONTCADA I REIXAC, Spain',
  85, 'WANT_TO_CONTACT', 'Llinares Import – Carla World: Over 35 Years of Innovation with Tradition

 At Llinares Import, S.L., we have been importing and distributing minerals, fashion jewelry, decoration, textiles, souvenirs...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Spain', 'Hall 6 - a4bTk000000UefxIAC', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_046', 'LOOPLABB B.V', 'foreign_exhibitor', '🇳🇱 Exhibiting Team · Netherlands', 'Mk', 'mk@looplab.com', '+31207239636', 'https://www.looplabb.com/', 'ENERGIESTRAAT 9, NAARDEN, Netherlands',
  85, 'WANT_TO_CONTACT', 'Looplabb Opens your eyes

 Choose your style, choose glasses and open your eyes with Looplabb. Looplabb is an innovative eyewear brand. Specializing in handmade, optician-quality, ready-made reading a...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Netherlands', 'a4bTk000000TAbtIAG', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_047', 'LOUSÃTEXTIL LDA', 'foreign_exhibitor', '🇵🇹 Exhibiting Team · Portugal', 'Lousatextil', 'lousatextil@lousatextil.pt', '+351 239991401', '', 'ZONA INDUSTRIAL DOS MATINHOS PAV 6. E 7, Lousã, Portugal',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Portugal.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Portugal', 'Hall 6 - a4bTk000000ZR29IAG', 'Milano Home 2027', 'france_spain', NULL, false
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_048', 'MAILEG GMBH', 'tier1_luxury', '🇩🇰 Exhibiting Team · Denmark', 'Lsg', 'lsg@maileg.dk', '0049 1732334128', 'https://www.maileg.it', 'GARTNERSTR. 16A, HAMBURG, Denmark',
  95, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Denmark.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Denmark', 'a4bTk000000VMqfIAG', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_049', 'MAJORDOMO', 'foreign_exhibitor', '🇨🇭 Exhibiting Team · Switzerland', 'Trade Fair Desk', 'info@majordomo.ch', '+41796212137', 'https://majordomo.ch/', 'PIAZZA GRANDE 10, RIVA S. VITALE, Switzerland',
  85, 'WANT_TO_CONTACT', 'Majordomo was born in the Swiss mountains, where precision, discretion, and attention to detail are part of the culture. But it is not a closed brand: it grows thanks to dialogue with international pa...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Switzerland', 'a4bTk000000TwtRIAS', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_050', 'MOMOLIO', 'foreign_exhibitor', '🇱🇹 Exhibiting Team · Lithuania', 'Andrius', 'andrius@momolio.lt', '0037061111165', 'https://www.keramikdeko.de/', 'ENERGETIKU G. 8,, KAUNAS, Lithuania',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Lithuania.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Lithuania', 'a4bTk000000ZSELIA4', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_051', 'MuiT TIZIANA MUCCHIANI', 'foreign_exhibitor', '🇨🇭 Exhibiting Team · Switzerland', 'Tmucchiani', 'tmucchiani@gmail.com', '0041 786893004', 'https://www.tizianamucchiani.com', 'VIA PENATE 16, MENDRISIO, Switzerland',
  85, 'WANT_TO_CONTACT', 'MuiT by Tiziana Mucchiani: Sculpture as an Emotional Journey Through Form, Material, and Identity

 Swiss-Italian artist Tiziana Mucchiani explores the connection between form and inner life through a...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Switzerland', 'a4bTk000000W5mBIAS', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_052', 'NAASGRANSGARDEN', 'foreign_exhibitor', '🇸🇪 Exhibiting Team · Sweden', 'Nääsgränsgården Team', 'info@naasgransgarden.se', '0046320787100', 'http://naasgransgarden.se', 'GOTEBORGSVAGEN 10A, BORAS, Sweden',
  85, 'WANT_TO_CONTACT', '-We look forward to creating many wonderful moments and memories together with you — big and small alike....', 'milano_home_2027', 'dmitri@dorogo.eu', 'Sweden', 'a4bTk000000T9XlIAK', 'Milano Home 2027', 'uk_north', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_053', 'NATURE &amp; BOTANIC', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Olivier', 'olivier@nature-et-botanic.com', '+33613240271', 'https://www.nature-et-botanic.com', 'ZA LA GARRONNETTE, SAINTE MAXIME, France',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'France', 'a4bTk000000TyIYIA0', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_054', 'OUT OF THE BLUE KG', 'foreign_exhibitor', '🇩🇪 Exhibiting Team · Germany', 'Out of the Blue Team', 'info@ootb.de', '00494298935335', 'http://www.ootb.de', 'BEIM NEUEN DAMM 28, LILIENTHAL, Germany',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Germany.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'Hall 6 - a4bTk000000Zf6jIAC', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_055', 'P. & G. SRL', 'foreign_exhibitor', '🇸🇲 Exhibiting Team · San Marino', 'Trade Fair Desk', 'info@pgarmiantiche.com', '0039 0549997062', 'http://www.pgarmiantiche.com', 'VIA RIO CERBIANO 20, FIORENTINO, San Marino',
  85, 'WANT_TO_CONTACT', 'P. & G. SRL, based in the Republic of San Marino, specializes in the wholesale distribution of historical weapon replicas, swords, katanas, daggers, medieval, fantasy and collectible items. Its extens...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'San Marino', 'Hall 6 - a4bTk000000WF5ZIAW', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_056', 'PAIS BONITO SL', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Trade Fair Desk', 'info@pritech.eu', '', 'https://www.pritech.eu', 'CALLE VOLTA, GETAFE, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000WVwjIAG', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_057', 'PARTILANDIA 2010 SL', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Trade Fair Desk', 'info@partilandiashop.com', '0034910636712', 'https://partilandia.es/', 'CALLE ZURBANO 66, MADRID, Spain',
  85, 'WANT_TO_CONTACT', 'With more than 10 years of experience in the industry, we are importers, manufacturers, and wholesale distributors of costumes and accessories for all types of parties: Carnival, Halloween, Christmas,...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Spain', 'a4bTk000000ToxVIAS', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_058', 'PLAVOANGEL GMBH', 'foreign_exhibitor', '🇩🇪 Exhibiting Team · Germany', 'Office De', 'office.de@plavoangel.com', '', 'https://www.bubuxin.eu', 'OTTO-HAHN-STR 36, DREIEICH, Germany',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Germany.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000ZcvFIAS', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_059', 'PTS SRL', 'foreign_exhibitor', '🇸🇲 Exhibiting Team · San Marino', 'Trade Fair Desk', 'amministrazione@venditapeluche.com', '0039 0549 901425', '', 'VIA DEGLI ANGARIARI 8, ROVERETA DI FALCIANO, San Marino',
  85, 'WANT_TO_CONTACT', 'Scopri il nostro vasto assortimento di peluche, giocattoli e articoli da regalo. Offriamo tutti i brand più iconici e continuiamo ad arricchire la nostra vetrina con novità esclusive....', 'milano_home_2027', 'igor@b2b-dorogo.it', 'San Marino', 'Hall 6 - a4bTk000000UqfVIAS', 'Milano Home 2027', 'rest_world', NULL, false
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_060', 'RASTELLI GIFT SRL', 'foreign_exhibitor', '🇸🇲 Exhibiting Team · San Marino', 'Rastelligiftsrl', 'rastelligiftsrl@gmail.com', '0039 0549 997656', 'https://www.rastelligift.it', 'VIA FOSSO DELLA RUPE 20, FIORENTINO, San Marino',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from San Marino.', 'milano_home_2027', 'dmitri@dorogo.eu', 'San Marino', 'Hall 6 - a4bTk000000WMILIA4', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_061', 'RICE AS', 'foreign_exhibitor', '🇩🇰 Exhibiting Team · Denmark', 'Valo', 'valo@rice.dk', '004563113535', 'http://www.ricebyrice.com', 'HAVNEGADE 100 E, ODENSE C, Denmark',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Denmark.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Denmark', 'a4bTk000000T6ejIAC', 'Milano Home 2027', 'uk_north', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_062', 'ROBOTIME EUROPE LTD', 'foreign_exhibitor', '🇧🇬 Exhibiting Team · Bulgaria', 'Trade Fair Desk', 'eu@robotime.com', '0086 18260108612', 'https://www.robotime.eu', 'KOSTANTIN SHTARKELOV 12, SOFIA, Bulgaria',
  85, 'WANT_TO_CONTACT', '-...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Bulgaria', 'a4bTk000000T6IAIA0', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_063', 'SA MOULIN ROTY', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Trade Fair Desk', 'export@moulinroty.fr', '0033 0251120044', 'http://www.moulinroty.fr', '50 LA SANGLE, NORT-SUR-ERDRE, France',
  85, 'WANT_TO_CONTACT', 'For over 50 years, Moulin Roty has been creating toys designed in France to accompany childhood, imbued with tenderness, poetry and craftsmanship....', 'milano_home_2027', 'igor@b2b-dorogo.it', 'France', 'a4bTk000000Tdh7IAC', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_064', 'SERAX NV', 'tier1_luxury', '🇧🇪 Exhibiting Team · Belgium', 'Serax Team', 'info@serax.com', '003234580582', 'http://www.serax.com', 'VELDKANT 21, ANTWERPEN, Belgium',
  95, 'WANT_TO_CONTACT', 'Serax is a Belgian design brand, creating contemporary homeware n collaboration with leading international designers and makers. From dinnerware, home accessories, lighting, pottery and furniture, the...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Belgium', 'a4bTk000000ZZKfIAO', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_065', 'SHALLS Barcelona', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Shalls', 'shalls@shalls.es', '0034620890594', 'https://www.shalls.es', 'PI I MARGALL 98-100, ESC B, 5-1, BARCELONA, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Spain', 'a4bTk000000VOajIAG', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_066', 'SNAZZY SANTA APS', 'foreign_exhibitor', '🇩🇰 Exhibiting Team · Denmark', 'Peter', 'peter@snazzysanta.com', '+45 61697697', 'https://WWW.SNAZZYSANTA.COM', 'Langøvej 7, Vordingborg, Denmark',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Denmark.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Denmark', 'a4bTk000000Tx38IAC', 'Milano Home 2027', 'uk_north', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_067', 'SOPHA DIFFUSION &#47; MAISON JIKI', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Infofrance', 'infofrance@sopha.ch', '+41223413253', 'http://www.maisonjiki.com', '114 ROUTE DE PERNIN, NEYDENS, France',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'France', 'a4bTk000000TxzBIAS', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_068', 'SUZHOU MARCH ARTS&CRAFTS & CO ., LTD', 'foreign_exhibitor', '🇨🇳 Exhibiting Team · China', 'Lbj Lucia', 'lbj.lucia@aliyun.com', '008613646228903', 'https://3march.en.alibaba.com', 'BUILDING 1, DONGHUAN BUILDING 2-6 FLOORS, JIANGSHU, China',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from China.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'China', 'a4bTk000000ZkUbIAK', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_069', 'THE MOSHI AB', 'foreign_exhibitor', '🇸🇪 Exhibiting Team · Sweden', 'Philip', 'philip@themoshi.se', '0046761012818', 'http://www.themoshi.se', 'VADENSJOVAGEN 302, LANDSKRONA, Sweden',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Sweden.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Sweden', 'a4bTk000000ZZqvIAG', 'Milano Home 2027', 'uk_north', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_070', 'THE OLPHACTORY', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Jaime', 'jaime@sevenreeds.com', '0034 609 16 10 84', 'https://www.theolphactory.com', 'CALLE ROBLE 114, SEGOVIA, VALVERDE DEL MAJANO, Spain',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000ZwdpIAC', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_071', 'TIMSTOR NV', 'foreign_exhibitor', '🇧🇪 Exhibiting Team · Belgium', 'Timstor Team', 'info@timstor.com', '0032 1 4673461', 'http://www.timstor.com', 'HOGE MAUW 1040, ARENDONK ANVERSA, Belgium',
  85, 'WANT_TO_CONTACT', 'Timstor has been a leading Christmas decorations wholesale specialist for over 30 years. 
 Our villages are still of the utmost importance, but more and more new product groups are being added to our ...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Belgium', 'a4bTk000000WE1RIAW', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_072', 'TISSUS MARINETTE', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Compta', 'compta@afdsaisons.com', '0033 0494733179', '', 'BOULEVARD CLEMENCEAU 4 BIS, SAINT-TROPEZ, France',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'dmitri@dorogo.eu', 'France', 'a4bTk000000Ts0DIAS', 'Milano Home 2027', 'france_spain', NULL, false
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_073', 'TOGIFT NOVA SL', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Trade Fair Desk', 'info@togiftsouvenirs.com', '0034 657371659', 'https://www.togiftsouvenirs.com', 'SAN ROMULO 19 LOCAL 2A, GRANADA, Spain',
  85, 'WANT_TO_CONTACT', 'Empresa dedicada a la elaboración de diseños personalizados para artículos de regalo y souvenirs...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Spain', 'Hall 6 - a4bTk000000aNPVIA2', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_074', 'TRANQUILLO GMBH', 'foreign_exhibitor', '🇩🇪 Exhibiting Team · Germany', 'Francesca', 'francesca@fabulous-tranquillo.com', '', 'http://www.tranquillo-shop.de', 'MARTA-FRAENKEL STR. 1, DRESDEN, Germany',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Germany.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000ZoJhIAK', 'Milano Home 2027', 'dach_benelux', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_075', 'ULULINA', 'foreign_exhibitor', '🇸🇬 Exhibiting Team · Singapore', 'Ululina Martinaz', 'ululina.martinaz@gmail.com', '0039 3342927277', 'https://www.ululinapets.com', '3 FRASER STREET - 03-23A DUO TOWER, SINGAPORE, Singapore',
  85, 'WANT_TO_CONTACT', 'ULULINA is born from the union of creativity and a deep love for animals.
 We focus on the design and production of high-quality silicone pet toys and accessories, defined by original shapes, modern c...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Singapore', 'a4bTk000000VxNBIA0', 'Milano Home 2027', 'rest_world', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_076', 'USE FAMILY SL', 'foreign_exhibitor', '🇪🇸 Exhibiting Team · Spain', 'Dgrafico', 'dgrafico@usefamily.com', '0034 961 201051', '', 'AV. ESPIOCA, 100, SILLA, Spain',
  85, 'WANT_TO_CONTACT', 'USE FAMILY is a family-run company founded in 1996 in Valencia, Spain. We’ve spent the last 30 years dedicated to creating plastic household products, and we love to think that our items are part of t...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'Hall 6 - a4bTk000000ZcX3IAK', 'Milano Home 2027', 'france_spain', NULL, false
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_077', 'VAN DER GUCHT, since 1870', 'tier1_luxury', '🇧🇪 Exhibiting Team · Belgium', 'Exhibition Logistics Desk', 'christmas@vdg.be', '0032 37713395', 'https://www.vdg.be/', 'EUROLAAN 4, TEMSE, Belgium',
  95, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Belgium.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Belgium', 'a4bTk000000YwSzIAK', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_078', 'VERSA HOME S.A.', 'tier1_luxury', '🇪🇸 Exhibiting Team · Spain', 'Milanohome', 'milanohome@versa.es', '0034 944341481', 'http://www.versa-home.it', 'CARRETERA BILBAO-GALDACANO 32, BILBAO, Spain',
  95, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Spain.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Spain', 'a4bTk000000VS6TIAW', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_079', 'WATER & WINES', 'foreign_exhibitor', '🇸🇪 Exhibiting Team · Sweden', 'Water & Wines Team', 'hello@waterandwines.com', '0046 0725383874', 'https://www.waterandwines.com/', 'SKÄLBYVÄGEN 21 BV, JÄRFÄLLA, Sweden',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Sweden.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'Sweden', 'a4bTk000000ZO5tIAG', 'Milano Home 2027', 'uk_north', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_080', 'WERNER VOSS GMBH', 'tier1_luxury', '🇩🇪 Exhibiting Team · Germany', 'David Voss', 'david.voss@hi-werns.com', '', 'https://www.hi-werns.com', 'FELDSTIEGE 60, MUENSTER, Germany',
  95, 'WANT_TO_CONTACT', 'WERNS® is an award-winning German design brand founded by the designer David Voß and designer & architect Alexandra Gördes in 2021. The name WERNS is based on the nickname of David’s father Werner, wh...', 'milano_home_2027', 'dmitri@dorogo.eu', 'Germany', 'a4bTk000000TAs1IAG', 'Milano Home 2027', 'tier1', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_081', 'WIDA IMPORT', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Widafouta', 'widafouta@gmail.com', '+33612174383', 'https://widafoutabasket.com', 'WIDA IMPORT  66 AVENUE DES CHAMPS ELYSÉES, PARIS, France',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'igor@b2b-dorogo.it', 'France', 'a4bTk000000TvpKIAS', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_082', 'WILDLIFE GARDEN AB', 'foreign_exhibitor', '🇸🇪 Exhibiting Team · Sweden', 'Helena', 'helena@wildlifegarden.se', '004643176800', 'https://www.wildlifegarden.se', 'ANGELHOMSVAGEN 263, BASTAD, Sweden',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from Sweden.', 'milano_home_2027', 'dmitri@dorogo.eu', 'Sweden', 'a4bTk000000WQLxIAO', 'Milano Home 2027', 'uk_north', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_083', 'WRENDALE DESIGNS', 'foreign_exhibitor', '🇬🇧 Exhibiting Team · United Kingdom', 'Wrendale Designs Team', 'info@wrendaledesigns.co.uk', '0044 1652680253', 'https://www.wrendaledesigns.co.uk/', 'UNIT 6 STATION ROAD, BRIGG, United Kingdom of Great Britain and Northern Ireland',
  85, 'WANT_TO_CONTACT', 'Inspired by a love for wildlife, craftsmanship, and sustainability, Wrendale Designs creates award-winning greeting cards, stationery and gifts, featuring artist Hannah Dale''s characterful watercolour...', 'milano_home_2027', 'igor@b2b-dorogo.it', 'United Kingdom', 'a4bTk000000T5ltIAC', 'Milano Home 2027', 'uk_north', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
insert into public.event_planners (
  id, name, agency_type, agency_type_label, contact_person, email, phone, website, base_city,
  relevance_score, status, notes, source, sender_email, country, hall_booth, fair_event, region_group, origin_hub, is_enriched
) values (
  'exhibitor_mhome_084', 'YLIADES SAS', 'foreign_exhibitor', '🇫🇷 Exhibiting Team · France', 'Yliades Team', 'info@yliades.fr', '0033 556696894', 'https://www.yliades.com/', 'RUE RADIO LONDRES, BEGLES GIRONDE, France',
  85, 'WANT_TO_CONTACT', 'Verified Fiera Milano foreign exhibiting team from France.', 'milano_home_2027', 'dmitri@dorogo.eu', 'France', 'a4bTk000000TvirIAC', 'Milano Home 2027', 'france_spain', NULL, true
) on conflict (id) do update set
  name = excluded.name,
  agency_type = excluded.agency_type,
  agency_type_label = excluded.agency_type_label,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  base_city = excluded.base_city,
  relevance_score = excluded.relevance_score,
  status = case when public.event_planners.status in ('CONTACTED', 'APPROVED_PARTNER', 'REJECTED') then public.event_planners.status else excluded.status end,
  sender_email = excluded.sender_email,
  country = excluded.country,
  hall_booth = excluded.hall_booth,
  fair_event = excluded.fair_event,
  region_group = excluded.region_group,
  is_enriched = excluded.is_enriched;
