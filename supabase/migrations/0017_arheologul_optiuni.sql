-- Arheologul de Opțiuni — extrage dotările de fabrică rare/valoroase din
-- descrierea anunțului. bonus_dotari_rare e calculat și stocat, dar
-- INTENȚIONAT NECONECTAT la offer_score()/offerScore() — formula de scoring
-- e sursa de adevăr din v5 și modificarea ei necesită acordul explicit al
-- beneficiarului (vezi comentariul din lib/scoring.ts) + actualizarea
-- testelor de paritate SQL/TS. Rămâne un follow-up separat, deliberat.
alter table public.offers
  add column if not exists dotari_rare_detectate jsonb,
  add column if not exists nota_raritate text,
  add column if not exists bonus_dotari_rare int check (bonus_dotari_rare between 0 and 10);
