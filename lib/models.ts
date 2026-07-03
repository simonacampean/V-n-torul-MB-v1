// ============================================================
// Modelele țintă. Sursa primară: tabela `target_models` (Supabase).
// Fallback: valorile exacte din seed (identice cu v5) — folosit când
// variabilele de mediu Supabase nu sunt configurate (ex. preview local).
// ============================================================
import { createClient } from '@supabase/supabase-js';

export type Body = 'sedan' | 'coupe' | 'roadster';

export interface TargetModel {
  code: string;
  name: string;
  years: string;
  year_from: number;
  year_to: number;
  band_lo: number;
  band_hi: number;
  body: Body;
  thesis: string;
  checklist: string[];
  tags: string[];
  verdict: string;
  gallery_query: string;
  prod_note: string | null;
  hunt_query: string;
}

/** Valorile exacte din v5 / seed.sql — nu se modifică fără acordul beneficiarului. */
export const SEED_MODELS: TargetModel[] = [
  {
    code: 'W124', name: 'Mercedes-Benz W124 / C124 Coupé', years: '1984–1997',
    year_from: 1984, year_to: 1997, band_lo: 9000, band_hi: 18000, body: 'coupe',
    thesis: 'Ultimul Mercedes construit „fără buget" — reper absolut de fiabilitate. Sedanurile sunt numeroase, dar exemplarele originale, neruginite, cu istoric complet au devenit rare. Coupé-ul C124 (300CE / E320) e alegerea de investiție: producție mică, design Bruno Sacco, cel mai căutat de colecționari.',
    checklist: ['Rugină: pragurile, punctele de cric, aripile spate, capacul portbagajului', 'Cablajul motor M104 (1992–1995): izolație biodegradabilă — verifică dacă a fost înlocuit', 'Cutia automată: schimburi line, ulei curat', 'Interior original, netăiat, fără găuri de accesorii'],
    tags: ['Fiabilitate ★★★', 'Comunitate uriașă', 'Coupé = raritate', 'Potențial ridicat'],
    verdict: 'PRIORITATE MAXIMĂ — coupé C124, sub 150.000 km',
    gallery_query: 'Mercedes C124 300CE coupe', prod_note: '~2,7 mil. total · Coupé C124: doar ~141.000', hunt_query: 'W124',
  },
  {
    code: 'R129', name: 'Mercedes-Benz SL (R129)', years: '1989–2001',
    year_from: 1989, year_to: 2001, band_lo: 13000, band_hi: 20000, body: 'roadster',
    thesis: "Roadsterul „over-engineered\" al anilor '90, nedumeritor de ieftin pentru ce oferă. Decapotabilele se apreciază istoric mai bine decât coupé-urile, iar R129 e ultimul SL din epoca de aur a calității Mercedes. SL320 (6 cil.) și SL500 (V8) sunt în buget la exemplare bune.",
    checklist: ['Softtop-ul și mecanismul hidraulic al plafonului — reparațiile sunt scumpe', 'Rugină: arcade roți, sub bandourile laterale', 'Istoric service complet — motoarele M104/M119 sunt eterne DOAR cu întreținere', 'Hardtop-ul original inclus = plus de valoare'],
    tags: ['Decapotabilă', 'V8 accesibil', 'Sub radar', 'Creștere lentă și sigură'],
    verdict: 'CUMPĂRĂ ACUM — fereastra sub 20k se închide pentru SL500',
    gallery_query: 'Mercedes SL R129 roadster', prod_note: '~204.000 buc. în 12 ani — puțin pentru un SL', hunt_query: 'SL R129',
  },
  {
    code: 'W201', name: 'Mercedes-Benz 190E (W201)', years: '1982–1993',
    year_from: 1982, year_to: 1993, band_lo: 8000, band_hi: 16000, body: 'sedan',
    thesis: '„Baby Benz"-ul care a definit calitatea compactă. Versiunile 2.6 (6 cilindri) și pachetul Sportline sunt cele colecționabile — restul rămân mașini bune, dar comune. Fratele 2.5-16 Evo a explodat deja ca preț; efectul se scurge în jos spre 2.6 și Sportline.',
    checklist: ['Caută DOAR 2.6 sau Sportline, ideal cu manuală', 'Rugină: aripi față, praguri sub bandouri', 'Kilometraj real documentat — multe au fost date înapoi', 'Originalitate 100%: fără eleroane, jante sau volane aftermarket'],
    tags: ["Icon anii '80", 'Efect 2.5-16', 'Piese ieftine', 'Comunitate mare'],
    verdict: 'SELECTIV — doar 2.6 / Sportline impecabile',
    gallery_query: 'Mercedes 190E W201', prod_note: '~1,88 mil. · 2.6 și Sportline: fracțiune mică', hunt_query: '190E W201',
  },
  {
    code: 'W126', name: 'Mercedes-Benz S-Klasse (W126)', years: '1979–1991',
    year_from: 1979, year_to: 1991, band_lo: 10000, band_hi: 18000, body: 'sedan',
    thesis: 'Cel mai reușit S-Klasse din istorie, 12 ani în producție fără rival. Sedanurile V8 (420SE/500SE) sunt în buget și cresc constant; coupé-ul SEC e ținta ideală, dar exemplarele bune depășesc deja 20k — dacă prinzi unul corect în buget, e lovitura de grație.',
    checklist: ['Lanț de distribuție simplu vs dublu la V8-urile timpurii — verifică istoricul', 'Rugină: parbriz, praguri, sub bateria din portbagaj', 'Suspensie hidraulică spate (unde există) — funcțională', 'Istoric de garaj: mașinile astea sufereau iarna'],
    tags: ['V8 de colecție', 'Statut blue-chip', 'SEC = jackpot', 'Eleganță Sacco'],
    verdict: 'OPORTUNIST — sedan V8 excelent sau SEC sub-evaluat',
    gallery_query: 'Mercedes W126 500SE', prod_note: '~818.000 sedan · Coupé SEC: ~74.000', hunt_query: 'W126',
  },
  {
    code: 'W123', name: 'Mercedes-Benz W123', years: '1976–1985',
    year_from: 1976, year_to: 1985, band_lo: 8000, band_hi: 16000, body: 'coupe',
    thesis: 'Indestructibilul absolut — legenda fiabilității Mercedes. Statut de clasic deja consolidat (40+ ani), eligibil pentru înmatriculare de vehicul istoric în România. Coupé-ul 230CE/280CE e varianta de investiție; sedanul e varianta de siguranță.',
    checklist: ['Rugină — inamicul #1: aripi, praguri, podea, suporturi de cric', 'Motoarele merg veșnic; caroseria decide prețul', 'Documentație istorică: carnet service, facturi vechi', 'Culori de epocă originale (nu revopsit în negru modern)'],
    tags: ['Fiabilitate legendară', 'Vehicul istoric RO', 'Comunitate globală', 'Risc minim'],
    verdict: 'SIGURANȚĂ — coupé CE original, cel mai bun exemplar disponibil',
    gallery_query: 'Mercedes W123 280CE coupe', prod_note: '~2,7 mil. · Coupé CE: ~100.000', hunt_query: 'W123',
  },
  {
    code: 'W140', name: 'Mercedes-Benz S-Klasse (W140)', years: '1991–1998',
    year_from: 1991, year_to: 1998, band_lo: 6000, band_hi: 13000, body: 'sedan',
    thesis: "Ultimul Mercedes proiectat fără compromisuri de cost. Azi e cel mai ieftin bilet spre statutul de colecție viitor: generația care l-a admirat în anii '90 intră acum la putere de cumpărare. Coupé-ul C140 (doar ~26.000 buc.) e raritatea reală din buget.",
    checklist: ['Cablaj motor biodegradabil (1993–1995) — înlocuit sau nu', 'Sisteme electrice și pneumatice: totul trebuie să funcționeze', 'Evită exemplarele „de fițe" modificate — doar 100% original', 'Costuri de întreținere mari: cumpără cel mai bun, nu cel mai ieftin'],
    tags: ['Pariu pe viitor', 'C140 = producție mică', 'Încă ieftin', 'Trend youngtimer'],
    verdict: 'SPECULATIV — C140 coupé original sau S500 impecabil',
    gallery_query: 'Mercedes W140 S500', prod_note: '~406.000 · Coupé C140: ~26.000', hunt_query: 'W140',
  },
];

const MODEL_ORDER = SEED_MODELS.map((m) => m.code);

/** Citește modelele din Supabase; fără env configurat sau la eroare → seed local. */
export async function getTargetModels(): Promise<{ models: TargetModel[]; source: 'db' | 'seed' }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { models: SEED_MODELS, source: 'seed' };
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('target_models')
      .select('code,name,years,year_from,year_to,band_lo,band_hi,body,thesis,checklist,tags,verdict,gallery_query,prod_note,hunt_query')
      .eq('active', true);
    if (error || !data?.length) return { models: SEED_MODELS, source: 'seed' };
    const models = (data as TargetModel[]).slice().sort(
      (a, b) => MODEL_ORDER.indexOf(a.code) - MODEL_ORDER.indexOf(b.code)
    );
    return { models, source: 'db' };
  } catch {
    return { models: SEED_MODELS, source: 'seed' };
  }
}

export const galleryUrl = (m: TargetModel) =>
  `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(m.gallery_query)}`;

export const fmt = (n: number) => n.toLocaleString('ro-RO');
