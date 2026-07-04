-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0010: consimțământ explicit la înregistrare (M5, GDPR-01)
-- ToS/Politica de confidențialitate: obligatoriu, marcat cu timestamp (dovadă
-- de consimțământ). Marketing: separat, opțional — alertele de produs NU sunt
-- marketing (sunt legitime prin contract, per GDPR-01 din caiet).
-- Rulare: supabase db push (sau lipite direct în SQL Editor)
-- ============================================================

alter table public.profiles add column if not exists tos_accepted_at timestamptz;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name, marketing_consent, tos_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false),
    case when (new.raw_user_meta_data->>'tos_accepted')::boolean is true then now() else null end
  );
  insert into public.user_prefs (user_id) values (new.id);
  return new;
end $$;
