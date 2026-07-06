-- Ghidul RAR — eligibilitate „auto de epocă" (RAR/FIVA, prag legal de 30 de
-- ani + originalitate constructivă) + rezumat curat în română al descrierii
-- externe. Denumire consecventă cu restul schemei (fără prefixul `ai_` —
-- vezi autenticitate_pachet, risc_autenticitate_scor etc.).
alter table public.offers
  add column if not exists eligibilitate_rar text check (eligibilitate_rar in ('Eligibil', 'Neeligibil', 'Incert')),
  add column if not exists rezumat_ro text;
