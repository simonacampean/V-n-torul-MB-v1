-- Conectează bonusul de raritate (offers.bonus_dotari_rare, calculat de
-- Arheologul de Opțiuni — migrarea 0017) la formula reală de scoring.
-- Decizie explicită a beneficiarului, cerută separat de construcția
-- agentului: modificarea formulei S-01 (v5 = sursă de adevăr) necesită
-- acord explicit, documentat în lib/scoring.ts.
--
-- Semnătura funcției se schimbă (parametru nou) — trebuie eliminată
-- versiunea veche întâi; altfel PostgreSQL ar păstra ambele ca
-- supraîncărcări distincte, ambiguu la apelul din supabase-js (care trimite
-- argumente numite, nu poziționale).
drop function if exists public.offer_score(int, text, int, int, text, boolean, text, int, int);

create or replace function public.offer_score(
  p_price int, p_cond text, p_band_lo int, p_band_hi int,
  p_options text, p_history boolean, p_negotiability text,
  p_transport_cost int, p_km int, p_bonus_dotari_rare int default 0
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

  s := s + coalesce(p_bonus_dotari_rare, 0);

  return least(100, s);
end;
$$;

-- FIX unei erori PREEXISTENTE (din migrarea 0005, descoperită abia acum,
-- testând efectiv scorul rezultat — până acum niciun test nu verifica
-- offers.score după recalculare, doar offer_score() izolat): PostgreSQL nu
-- permite ca un LEFT JOIN din clauza FROM a unui UPDATE să refere alias-ul
-- tabelei-țintă („o") în condiția lui ON — `left join transport_costs tc on
-- tc.country_code = upper(o.country)` arunca „invalid reference to
-- FROM-clause entry for table o" la FIECARE execuție. Rezultat real: TOATE
-- ofertele active din producție aveau score=0, excellent=false — pg_cron
-- rula funcția orar, dar eșua silențios de fiecare dată (eroarea RPC nu era
-- verificată). Fix: subquery scalar corelat în loc de LEFT JOIN pe alias-ul
-- țintei (permis — o subquery corelată poate referi rândul curent al UPDATE).
create or replace function public.recalculate_offer_scores()
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.offers o
  set
    score = public.offer_score(
      o.price, o.cond, m.band_lo, m.band_hi, o.options, o.history_verified,
      o.negotiability,
      coalesce((select tc.cost_eur from public.transport_costs tc where tc.country_code = upper(o.country)), 800),
      o.km, coalesce(o.bonus_dotari_rare, 0)
    ),
    excellent = public.offer_score(
      o.price, o.cond, m.band_lo, m.band_hi, o.options, o.history_verified,
      o.negotiability,
      coalesce((select tc.cost_eur from public.transport_costs tc where tc.country_code = upper(o.country)), 800),
      o.km, coalesce(o.bonus_dotari_rare, 0)
    ) >= 85
  from public.target_models m
  where o.model_code = m.code and o.status = 'active';
end;
$$;
