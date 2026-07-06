-- „Vânători Reușite" — secțiune publică de mini-studii de caz reale, trimise
-- de utilizatori și aprobate de admin înainte de a deveni publice. Denumiri
-- ajustate față de cererea inițială pentru consecvență cu restul schemei:
-- `model_id` → `model_code` (FK real către target_models, ca peste tot),
-- `aprobat_admin boolean` → `moderation` text (același tipar pending/
-- approved/rejected ca la offers, cu aceleași politici RLS deja testate).
create table public.success_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_code text not null references public.target_models(code),
  an_fabricatie int,
  pret_achizitie int not null check (pret_achizitie > 0),
  pret_mediu_piata_atunci int,
  -- Nume/oraș complet opțional, scris chiar de utilizator (consimțământ
  -- explicit pentru afișare publică) — NICIODATĂ derivat automat din cont.
  nume_afisat text,
  text_poveste text not null,
  moderation text not null default 'pending' check (moderation in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index idx_success_stories_moderation on public.success_stories (moderation, created_at desc);

alter table public.success_stories enable row level security;

-- Public: doar poveștile aprobate; proprietarul își vede mereu propria poveste
-- (ca să-i vadă statusul); adminul vede tot.
create policy "success_stories_public_read" on public.success_stories
  for select using (moderation = 'approved' or user_id = auth.uid() or public.is_admin());

-- Userul își trimite propria poveste, forțat „pending" — nu se poate auto-aproba.
create policy "success_stories_user_insert" on public.success_stories
  for insert with check (user_id = auth.uid() and moderation = 'pending');

-- Doar adminul aprobă/respinge.
create policy "success_stories_admin_update" on public.success_stories
  for update using (public.is_admin()) with check (public.is_admin());

create policy "success_stories_admin_delete" on public.success_stories
  for delete using (public.is_admin());
create policy "success_stories_owner_delete_pending" on public.success_stories
  for delete using (user_id = auth.uid() and moderation = 'pending');
