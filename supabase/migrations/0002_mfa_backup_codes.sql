-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0002: coduri de rezervă 2FA (M1, A-02)
-- Supabase Auth MFA (TOTP) nu are coduri de rezervă native — le gestionăm
-- noi: hash-uite (sha-256), niciodată în clar în baza de date.
-- Rulare: supabase db push (sau lipite direct în SQL Editor)
-- ============================================================

create table public.mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_mfa_backup_codes_user on public.mfa_backup_codes (user_id);

alter table public.mfa_backup_codes enable row level security;

-- Utilizatorul își vede/gestionează exclusiv propriile coduri de rezervă
-- (generare/consum/regenerare — toate prin server actions, niciodată direct
-- din browser, dar folosind sesiunea proprie a userului, nu service role).
create policy "mfa_backup_codes_own_all" on public.mfa_backup_codes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
