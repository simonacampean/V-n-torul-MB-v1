-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0005: motorul de oferte (M2)
-- RLS pentru offers/offer_price_history (rămăsese fără politici din M0 —
-- RLS activ + zero politici = zero acces, inclusiv pentru admin) + scoring
-- SQL (S-01), identic formulei offerScore din lib/scoring.ts, rulat orar
-- prin pg_cron.
-- ============================================================

-- ---------- RLS: offers ----------
-- NOTĂ: offers_public_read / offers_user_insert / offers_owner_or_admin_update
-- existau deja pe baza de date (origine neclarificată — tabela era goală,
-- 0 rânduri, fără risc). Le redeclar aici (drop+create) ca migrarea să fie
-- sursa de adevăr reproductibilă, fără să schimb comportamentul confirmat bun.

drop policy if exists "offers_public_read" on public.offers;
create policy "offers_public_read" on public.offers
  for select using (
    (status = 'active' and moderation = 'approved')
    or public.is_admin()
    or submitted_by = auth.uid()
  );

-- I-03: userul publică propriul anunț direct — blocat la moderation='pending',
-- nu se poate auto-aproba.
drop policy if exists "offers_user_insert" on public.offers;
create policy "offers_user_insert" on public.offers
  for insert with check (submitted_by = auth.uid() and moderation = 'pending');

-- Userul își poate corecta propriul anunț cât timp e „pending" (nu poate
-- schimba el însuși moderation); adminul poate actualiza orice (aprobare/
-- respingere, recalcul scor manual).
drop policy if exists "offers_owner_or_admin_update" on public.offers;
create policy "offers_owner_or_admin_update" on public.offers
  for update using (public.is_admin() or submitted_by = auth.uid())
  with check (public.is_admin() or (submitted_by = auth.uid() and moderation = 'pending'));

-- I-02 (import raport agent, moderation='approved' direct) se face prin
-- clientul admin (service role) în server action — nu prin sesiunea userului,
-- deci nu are nevoie de politică INSERT suplimentară aici.
create policy "offers_admin_delete" on public.offers
  for delete using (public.is_admin());
create policy "offers_owner_delete_pending" on public.offers
  for delete using (submitted_by = auth.uid() and moderation = 'pending');

-- ---------- RLS: offer_price_history ----------
-- oph_public_read (citire complet publică) exista deja — inofensiv (rânduri
-- fără sens fără id-ul ofertei părinte, care are propriile restricții RLS).
drop policy if exists "oph_public_read" on public.offer_price_history;
create policy "oph_public_read" on public.offer_price_history for select using (true);

drop policy if exists "oph_admin_write" on public.offer_price_history;
create policy "oph_admin_write" on public.offer_price_history
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- S-01 — scoring calitate-preț, identic lib/scoring.ts::offerScore().
-- Funcție pură (fără efecte), testabilă direct din SQL.
-- ============================================================
create or replace function public.offer_score(
  p_price int, p_cond text, p_band_lo int, p_band_hi int,
  p_options text, p_history boolean, p_negotiability text,
  p_transport_cost int, p_km int
) returns int
language plpgsql immutable as $$
declare
  mult numeric;
  lo numeric;
  hi numeric;
  s int := 0;
begin
  mult := case p_cond when '1' then 1.30 when '2' then 1.00 when '3' then 0.70 when '4' then 0.45 else 1.00 end;
  lo := p_band_lo * mult;
  hi := p_band_hi * mult;

  s := s + case
    when p_price <= lo * 0.85 then 40
    when p_price < lo then 32
    when p_price <= hi then 22
    else 8
  end;

  s := s + case lower(coalesce(p_options, ''))
    when 'full' then 15
    when 'partial' then 8
    else 3
  end;

  s := s + case when p_history then 15 else 0 end;

  s := s + case p_negotiability
    when 'DA' then 8
    when 'PARTIAL' then 4
    else 0
  end;

  s := s + case
    when p_transport_cost = 0 then 12
    when p_transport_cost <= 600 then 9
    when p_transport_cost <= 900 then 6
    else 3
  end;

  s := s + case
    when p_km is null then 4
    when p_km >= 80000 and p_km <= 150000 then 10
    when p_km < 80000 then 7
    else 4
  end;

  return least(100, s);
end;
$$;

-- Pragul de excelență (v5/lib/scoring.ts: EXC_THRESHOLD = 85).
create or replace function public.recalculate_offer_scores()
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.offers o
  set
    score = public.offer_score(
      o.price, o.cond, m.band_lo, m.band_hi, o.options, o.history_verified,
      o.negotiability, coalesce(tc.cost_eur, 800), o.km
    ),
    excellent = public.offer_score(
      o.price, o.cond, m.band_lo, m.band_hi, o.options, o.history_verified,
      o.negotiability, coalesce(tc.cost_eur, 800), o.km
    ) >= 85
  from public.target_models m
  left join public.transport_costs tc on tc.country_code = upper(o.country)
  where o.model_code = m.code and o.status = 'active';
end;
$$;

-- ---------- pg_cron: rulare orară ----------
create extension if not exists pg_cron;
select cron.schedule(
  'recalc-offer-scores',
  '0 * * * *',
  $$select public.recalculate_offer_scores()$$
) where not exists (select 1 from cron.job where jobname = 'recalc-offer-scores');
