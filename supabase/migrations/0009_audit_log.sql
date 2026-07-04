-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0009: jurnal de audit (M5, SEC-04)
-- Evenimente de securitate: login, activare/dezactivare 2FA, schimbare
-- parolă, ștergere cont, acțiuni admin. Se scrie DOAR prin clientul admin
-- (service role) — userii obișnuiți nu pot insera/modifica propriul jurnal.
-- Rulare: supabase db push (sau lipite direct în SQL Editor)
-- ============================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null check (action in (
    'login', 'mfa_enroll', 'mfa_unenroll', 'password_change',
    'account_delete_requested', 'admin_action'
  )),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_log_user on public.audit_log (user_id);
create index idx_audit_log_created on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Doar adminii pot citi jurnalul; nimeni nu scrie direct din sesiunea proprie
-- (toate inserările vin din server actions, prin clientul admin, care oricum
-- ocolește RLS — dar politica explicită documentează intenția și blochează
-- orice scriere accidentală prin sesiunea anon/authenticated).
create policy "audit_log_admin_read" on public.audit_log
  for select using (public.is_admin());
