-- Infrastructură pentru agenții AI (Detectivul de Autenticitate + orchestrator).
-- Coloane pe offers: scorul de risc de autenticitate, populat best-effort la
-- import (native I-03 sau draft I-02) când anunțul are un `note` de analizat.
alter table public.offers
  add column if not exists risc_autenticitate_scor int check (risc_autenticitate_scor between 1 and 10),
  add column if not exists risc_autenticitate_detalii jsonb;

-- Jurnal de execuții agent — sursă de adevăr pentru orchestrator (runAgent
-- loghează fiecare rulare aici) și pentru panoul admin „AI Agents" (stare,
-- rată de succes, cotă de utilizare per agent).
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  trigger_source text not null,
  status text not null check (status in ('success', 'error')),
  input jsonb,
  output jsonb,
  error_message text,
  duration_ms int,
  related_offer_id uuid references public.offers(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_agent_runs_agent_id on public.agent_runs (agent_id, created_at desc);

alter table public.agent_runs enable row level security;

-- Doar adminii citesc; nimeni nu scrie prin sesiunea proprie — orchestratorul
-- scrie exclusiv prin clientul admin (service_role), la fel ca audit_log.
create policy "agent_runs_admin_read" on public.agent_runs
  for select using (public.is_admin());
