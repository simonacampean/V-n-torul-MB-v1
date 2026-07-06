-- Filtru Anti-Fals (Replica Detector) — detectează anunțuri care revendică
-- o variantă flagship (AMG, V8, V12, Evo) dar al căror text/preț dezvăluie
-- o altă motorizare/an, sau un pachet montat ulterior. Aceeași structură ca
-- risc_autenticitate_scor/detalii de la Detectivul de Autenticitate: o
-- coloană scalară pentru filtrare/afișare rapidă + una jsonb cu raportul complet.
alter table public.offers
  add column if not exists autenticitate_pachet text check (autenticitate_pachet in ('Original', 'Modificat', 'Replica', 'Suspicios')),
  add column if not exists filtru_anti_fals_detalii jsonb;
