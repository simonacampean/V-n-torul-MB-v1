-- Grafic de Trend pe 5 ani — evoluția prețului mediu de piață per model,
-- afișat pe homepage, Lista mea și Top oferte. Numerotare 0023 (nu 0016 cum
-- s-a cerut inițial — 22 migrări existau deja la momentul acestei cereri).
--
-- NOTĂ IMPORTANTĂ: tabelul rămâne INTENȚIONAT GOL la livrare. Cererea inițială
-- includea un pas de "seed cu prețuri generate din cunoștințele Claude despre
-- piață" — refuzat explicit: ar însemna date financiare fabricate, prezentate
-- userilor drept istoric real de piață, exact ce evită sistematic restul
-- platformei (Evaluator de Fair-Value arată „date insuficiente" în loc să
-- ghicească, Vânători Reușite dispare fără povești reale). Populare reală:
-- fie din date proprii acumulate în timp (offer_price_history agregat pe
-- an), fie dintr-o sursă terță licențiată explicit de beneficiar (index de
-- piață auto clasică, cu atribuire) — nu prin ghicit.
create table public.model_macro_trends (
  id uuid primary key default gen_random_uuid(),
  model_code text not null references public.target_models(code),
  an_calendaristic int not null check (an_calendaristic between 2000 and 2100),
  pret_mediu_estimat int not null check (pret_mediu_estimat > 0),
  sursa text, -- ex. „date proprii (offer_price_history)”, „index XYZ (licențiat)” — obligatoriu de completat la inserare reală, nu lăsat null
  created_at timestamptz not null default now(),
  unique (model_code, an_calendaristic)
);

create index idx_model_macro_trends_model on public.model_macro_trends (model_code, an_calendaristic);

alter table public.model_macro_trends enable row level security;

-- Public read (aceleași date sunt afișate necondiționat pe homepage, ca și
-- target_models) — scriere doar prin clientul admin (service role) din
-- panoul de administrare, nicio politică de insert/update pentru useri.
create policy "model_macro_trends_public_read" on public.model_macro_trends
  for select using (true);
