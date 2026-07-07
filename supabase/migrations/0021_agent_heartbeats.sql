-- Observabilitate pentru rutina Claude programată — un rând per pipeline
-- (agent_report / watchlist_recheck / trend_scout), suprascris la fiecare
-- rulare reușită. Necesar separat de agent_runs: partea B (recheck Lista
-- mea) nu scrie nimic în DB când nu găsește schimbări de preț/descriere,
-- deci "ultima rulare" nu se putea deduce din efecte secundare existente.
create table public.agent_heartbeats (
  pipeline text primary key check (pipeline in ('agent_report', 'watchlist_recheck', 'trend_scout')),
  last_run_at timestamptz not null,
  last_summary jsonb
);

alter table public.agent_heartbeats enable row level security;

-- Doar admin citește (afișat în /admin/agenti); scrierea se face exclusiv
-- prin clientul admin (service role) din route handlere, deci nu e nevoie
-- de politică de insert/update pentru useri obișnuiți.
create policy "agent_heartbeats_admin_read" on public.agent_heartbeats
  for select using (public.is_admin());
