-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0007: notificări (M3)
-- Token de dezabonare cu un click (S-04, cerință legală) — trebuie să
-- funcționeze din linkul din email, fără autentificare.
-- ============================================================

alter table public.user_prefs add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists idx_prefs_unsubscribe_token on public.user_prefs (unsubscribe_token);

-- INSERT pe notifications se face doar prin clientul admin (job-ul de cron),
-- nu prin sesiunea userului — RLS rămâne read-only pentru user (deja exista
-- notif_own_select din M0).
