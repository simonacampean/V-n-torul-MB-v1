-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0001: schema completă (M0)
-- Conform caietului de sarcini, secțiunea 5.
-- Rulare: supabase db push (sau supabase migration up)
-- ============================================================

-- Extensii
create extension if not exists "pgcrypto";

-- ---------- Funcție utilitară updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- PROFILES (creat automat la signup prin trigger pe auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user','premium','admin')),
  country text default 'RO',
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_prefs (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TARGET_MODELS — cele 6 modele țintă (conținut editabil din admin)
-- ============================================================
create table public.target_models (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,               -- W124, R129, ...
  name text not null,
  years text not null,
  year_from int not null,
  year_to int not null,
  band_lo int not null,                    -- banda de preț pt. stare #2 (EUR)
  band_hi int not null,
  body text not null check (body in ('sedan','coupe','roadster')),
  thesis text not null,
  checklist jsonb not null default '[]',
  tags jsonb not null default '[]',
  verdict text not null,
  gallery_query text not null,
  prod_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_models_updated before update on public.target_models
  for each row execute function public.set_updated_at();

-- ============================================================
-- PLATFORMS — sursele de anunțuri
-- ============================================================
create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  country text not null,
  grp text not null check (grp in ('major','med','collect')),
  negotiability text not null check (negotiability in ('DA','PARTIAL','NU','REF')),
  note text,
  url_template text,                       -- șablon cu {query},{yearFrom},{yearTo}
  connector_type text not null default 'manual'
    check (connector_type in ('api','affiliate','manual','native')),
  legal_basis text,                        -- obligatoriu completat pt. api/affiliate
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- OFFERS — anunțuri agregate (motorul platformei)
-- ============================================================
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  model_code text not null references public.target_models(code),
  title text not null,
  price int not null check (price > 0),
  currency text not null default 'EUR',
  year int,
  km int,
  country text not null default 'DE',
  url text unique,
  cond text not null default '2' check (cond in ('1','2','3','4')),
  options text not null default 'standard' check (options in ('full','partial','standard')),
  history_verified boolean not null default false,
  negotiability text not null default 'DA' check (negotiability in ('DA','PARTIAL','NU')),
  note text,
  source_platform uuid references public.platforms(id),
  submitted_by uuid references auth.users(id),   -- pt. anunțuri native (I-03)
  moderation text not null default 'approved'
    check (moderation in ('pending','approved','rejected')),
  status text not null default 'active' check (status in ('active','expired','sold')),
  score int not null default 0,
  excellent boolean not null default false,
  fingerprint text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_offers_model_score on public.offers (model_code, score desc) where status = 'active';
create index idx_offers_fingerprint on public.offers (fingerprint);
create trigger trg_offers_updated before update on public.offers
  for each row execute function public.set_updated_at();

create table public.offer_price_history (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  price int not null,
  seen_at timestamptz not null default now()
);
create index idx_oph_offer on public.offer_price_history (offer_id, seen_at);

-- ============================================================
-- WATCHLIST_ITEMS — „Lista mea" per utilizator
-- ============================================================
create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_code text not null references public.target_models(code),
  title text not null,
  price int,
  url text,
  year int,
  km int,
  cond text not null default '2' check (cond in ('1','2','3','4')),
  note text,
  status text not null default 'Nou',      -- pipeline-ul din v5
  criteria jsonb not null default '{}',    -- cele 6 bife de scoring
  price_history jsonb not null default '[]',
  source_offer_id uuid references public.offers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_watchlist_user on public.watchlist_items (user_id, created_at desc);
create trigger trg_watchlist_updated before update on public.watchlist_items
  for each row execute function public.set_updated_at();

-- ============================================================
-- USER_PREFS — preferințe + alerte
-- ============================================================
create table public.user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  followed_models text[] not null default '{}',
  alert_threshold int not null default 85 check (alert_threshold between 50 and 100),
  max_budget int not null default 20000,
  preferred_countries text[] not null default '{}',
  email_alerts boolean not null default true,
  push_alerts boolean not null default false,
  daily_hunt_log jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
create trigger trg_prefs_updated before update on public.user_prefs
  for each row execute function public.set_updated_at();

-- ============================================================
-- NOTIFICATIONS — jurnal alerte trimise (anti-spam + statistici)
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  type text not null check (type in ('excellent','price_drop','digest')),
  channel text not null check (channel in ('email','push')),
  sent_at timestamptz not null default now(),
  opened_at timestamptz
);
create index idx_notif_user_day on public.notifications (user_id, sent_at);

-- ============================================================
-- TRANSPORT_COSTS + setări globale
-- ============================================================
create table public.transport_costs (
  country_code text primary key,
  cost_eur int not null check (cost_eur >= 0)
);
create table public.app_settings (
  key text primary key,
  value jsonb not null
);

-- ============================================================
-- SUBSCRIPTIONS (Stripe)
-- ============================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text check (plan in ('monthly','yearly')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create trigger trg_subs_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- AD_CAMPAIGNS — modulul de publicitate (AD-03)
-- ============================================================
create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  position text not null check (position in ('banner','infeed','footer')),
  mode text not null default 'direct' check (mode in ('adsense','direct')),
  sponsor_name text,
  image_url text,
  target_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CONTENT_PAGES — ghidurile (F-06)
-- ============================================================
create table public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text not null,                      -- markdown
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger trg_pages_updated before update on public.content_pages
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.user_prefs enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;
alter table public.target_models enable row level security;
alter table public.platforms enable row level security;
alter table public.offers enable row level security;
alter table public.offer_price_history enable row level security;
alter table public.transport_costs enable row level security;
alter table public.app_settings enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.content_pages enable row level security;

-- helper: e admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Date proprii: utilizatorul își vede/modifică exclusiv rândurile lui
create policy "profiles_own_select" on public.profiles for select using (user_id = auth.uid() or public.is_admin());
create policy "profiles_own_update" on public.profiles for update using (user_id = auth.uid());

-- Protecție anti-escaladare: doar adminii pot schimba câmpul role
create or replace function public.protect_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Schimbarea rolului este permisă doar administratorilor';
  end if;
  return new;
end $$;
create trigger trg_profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_role_change();

create policy "watchlist_own_all" on public.watchlist_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "prefs_own_all" on public.user_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notif_own_select" on public.notifications for select using (user_id = auth.uid());

create policy "subs_own_select" on public.subscriptions for select using (user_id = auth.uid());

-- Conținut public: citire pentru toți, scriere doar admin
create policy "models_public_read" on public.target_models for select using (active = true or public.is_admin());
create policy "models_admin_write" on public.target_models for all using (public.is_admin()) with check (public.is_admin());

create policy "platforms_public_read" on public.platforms for select using (active = true or public.is_admin());
create policy "platforms_admin_write" on public.platforms for all using (public.is_admin()) with check (public.is_admin());

create policy "transport_public_read" on public.transport_costs for select using (true);
create policy "transport_admin_write" on public.transport_costs for all using (public.is_admin()) with check (public.is_admin());

create policy "settings_public_read" on public.app_settings for select using (true);
create policy "settings_admin_write" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

create policy "pages_public_read" on public.content_pages for select using (published = true or public.is_admin());
create policy "pages_admin_write" on public.content_pages for all using (public.is_admin()) with check (public.is_admin());

create policy "ads_public_read" on public.ad_campaigns for select using (active = true);
create policy "ads_admin_write" on public.ad_campaigns for all using (public.is_admin()) with check (public.is_admin());

-- Oferte: publice cele aprobate/active; utilizatorii pot publica (intră în moderare);
-- autorul își vede anunțurile proprii indiferent de status; adminul vede tot.
create policy "offers_public_read" on public.offers for select
  using (
    (status = 'active' and moderation = 'approved')
    or submitted_by = auth.uid()
    or public.is_admin()
  );
create policy "offers_user_insert" on public.offers for insert
  with check (submitted_by = auth.uid() and moderation = 'pending');
create policy "offers_owner_or_admin_update" on public.offers for update
  using (public.is_admin() or submitted_by = auth.uid())
  with check (public.is_admin() or (submitted_by = auth.uid() and moderation = 'pending'));

create policy "oph_public_read" on public.offer_price_history for select using (true);

-- NOTĂ: inserările de sistem (joburi de ingestie, notificări, istoricul de preț,
-- abonamente prin webhook Stripe) se fac exclusiv cu service_role key din
-- Edge Functions / API server-side — service_role ocolește RLS prin design.
