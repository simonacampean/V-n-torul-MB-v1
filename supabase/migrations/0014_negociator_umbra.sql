-- Negociatorul din Umbră — agent care detectează schimbări subtile în
-- descrierea unui anunț salvat (Lista mea) coroborate cu scăderi de preț.
-- Descrierea nu era capturată nicăieri până acum (offer_price_history și
-- watchlist_items.price_history rețin doar prețul) — adăugăm istoricul de
-- descriere separat, ca să nu stricăm formatul price_history deja folosit
-- (sparkline, F-04).
alter table public.watchlist_items
  add column if not exists descriere_history jsonb not null default '[]',
  add column if not exists indice_urgenta_negociere int check (indice_urgenta_negociere between 0 and 100),
  add column if not exists schimbari_cheie_negociere jsonb,
  add column if not exists strategie_negociere text,
  add column if not exists negociere_actualizata_la timestamptz;

-- La fel ca related_offer_id pe agent_runs, dar pentru un agent care
-- operează pe date personale de utilizator (Lista mea), nu pe oferte publice.
alter table public.agent_runs
  add column if not exists related_watchlist_item_id uuid references public.watchlist_items(id) on delete set null;
