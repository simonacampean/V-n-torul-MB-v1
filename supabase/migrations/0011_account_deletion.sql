-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0011: ștergere cont self-service (M5, GDPR-02)
-- Cerere de ștergere cu grație de 30 de zile (anulabilă la re-autentificare);
-- anonimizarea reală = admin.auth.admin.deleteUser(), care cascadează prin
-- toate tabelele cu user_id references auth.users(id) on delete cascade —
-- CU EXCEPȚIA offers.submitted_by, care nu avea on delete și ar fi blocat
-- ștergerea (FK RESTRICT implicit) dacă userul a publicat vreun anunț nativ.
-- Rulare: supabase db push (sau lipite direct în SQL Editor)
-- ============================================================

alter table public.profiles add column if not exists deletion_requested_at timestamptz;

alter table public.offers drop constraint if exists offers_submitted_by_fkey;
alter table public.offers add constraint offers_submitted_by_fkey
  foreign key (submitted_by) references auth.users(id) on delete set null;
