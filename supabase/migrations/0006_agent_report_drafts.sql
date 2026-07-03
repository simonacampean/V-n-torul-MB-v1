-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0006: draft-uri raport agent programat (M2+)
-- Rutina Claude programată (skill „schedule") trimite periodic un raport de
-- cercetare aici — NU se importă automat; rămâne „pending" până un admin
-- îl aprobă explicit din /admin/oferte. Ținem omul în buclă la decizia
-- finală, chiar dacă generarea raportului e automatizată.
-- ============================================================

create table public.agent_report_drafts (
  id uuid primary key default gen_random_uuid(),
  generated_at text,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'imported', 'rejected')),
  created_at timestamptz not null default now()
);
create index idx_agent_drafts_status on public.agent_report_drafts (status, created_at desc);

alter table public.agent_report_drafts enable row level security;

-- Doar admin vede/gestionează draft-urile (curatoriat la nivel de platformă,
-- nu date per-utilizator) — inserarea se face prin route handler cu service
-- role, nu prin sesiunea vreunui user.
create policy "agent_drafts_admin_all" on public.agent_report_drafts
  for all using (public.is_admin()) with check (public.is_admin());
