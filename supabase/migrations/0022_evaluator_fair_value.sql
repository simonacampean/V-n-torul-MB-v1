-- Evaluator de Fair-Value — agent determinist (fără Claude) care estimează un
-- preț de referință dintr-un set de anunțuri comparabile (același model, an/
-- cilindree/dotări rare apropiate) și clasifică deviația prețului cerut pe o
-- scală de 5 trepte. `cilindree_litri` e stocată separat (nu doar calculată
-- ad-hoc) fiindcă selecția comps-urilor are nevoie s-o filtreze/compare prin
-- SQL, nu doar s-o afișeze.
alter table public.offers
  add column cilindree_litri numeric,
  add column fair_value_pret integer,
  add column fair_value_eticheta text check (
    fair_value_eticheta in ('Foarte Ieftin', 'Ieftin', 'Moderat', 'Scump', 'Foarte Scump')
  ),
  add column fair_value_deviatie_procentuala numeric,
  add column fair_value_comps_folosite int,
  add column fair_value_actualizat_la timestamptz;
