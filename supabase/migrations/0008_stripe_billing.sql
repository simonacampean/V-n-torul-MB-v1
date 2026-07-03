-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0008: monetizare (M4)
-- Webhook-ul Stripe trebuie să poată promova/retrograda profiles.role
-- (user <-> premium) folosind clientul admin (service_role) — dar
-- trigger-ul protect_role_change (M0) bloca ORICE schimbare de rol dacă
-- auth.uid() nu corespunde unui admin, inclusiv pentru service_role (care
-- nu are un auth.uid() propriu-zis). Extindem trigger-ul să permită explicit
-- și service_role, păstrând blocajul pentru useri obișnuiți.
-- ============================================================

create or replace function public.protect_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and not public.is_admin()
     and auth.role() <> 'service_role' then
    raise exception 'Schimbarea rolului este permisă doar administratorilor';
  end if;
  return new;
end $$;
