-- Calculator de Restaurare — estimează costul real total (preț + transport +
-- buget de reîmprospătare) pe baza problemelor detectate în descriere.
-- Coloane pur informative, afișate adminului și pe pagina publică de oferte —
-- NU sunt conectate la offer_score()/offerScore() (nicio cerere în acest sens).
alter table public.offers
  add column if not exists buget_reimprospatare_estimat text,
  add column if not exists detaliere_necesitati jsonb,
  add column if not exists mesaj_atentionare text;
