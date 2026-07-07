// ============================================================
// Evaluator de Fair-Value — estimează un preț de referință dintr-un set de
// anunțuri comparabile (k cele mai apropiate după an/cilindree/dotări rare,
// din același model) și clasifică deviația prețului cerut pe o scală de 5
// trepte.
//
// NU e „supervised learning" în sensul clasic (nu se antrenează niciun
// model, nu există coeficienți fitați pe date) — e evaluare pe comparabile
// (comps), aceeași metodă folosită real la evaluarea mașinilor/imobiliarelor.
// Cea mai apropiată rudă tehnică reală e k-Nearest-Neighbors (lazy learning):
// alegem cele mai similare anunțuri și luăm mediana prețului lor. Alegere
// deliberată, nu compromis — cu doar câteva zeci de anunțuri per model,
// orice model antrenat ar face overfitting garantat, iar o etichetă
// „Foarte Scump" trebuie să rămână explicabilă („comparat cu N anunțuri
// similare"), nu o cutie neagră.
//
// 100% determinist — fără apel Claude. Nu există text liber de interpretat
// (cilindree/dotări/an sunt deja date structurate), deci n-are ce să aducă
// un LLM aici — la fel ca partea de keyword_counter din Trend-Scout.
// ============================================================
import type { AgentDefinition } from './types';
import { extrageIndiciiTehnice } from './filtru-anti-fals';

// ---- Extragere cilindree (determinist) ----

/**
 * Estimează cilindreea (litri) din denumirea comercială Mercedes. Convenția
 * „NNN" din numele de model reflectă de obicei cilindreea × 100 (300CE =
 * 3.0L, 560SEL = 5.6L, SL500 = 5.0L, SL320 = 3.2L) — SINGURA excepție
 * cunoscută dintre cele 6 modele țintă e W201 („190E"): „190" e un
 * identificator de serie, NU cilindreea reală (190E de bază are 1.8-2.0L,
 * nu 1.9L) — pentru W201 citim DOAR sufixul explicit de cilindree (ex.
 * „2.3-16", „190E 2.6"), nu ghicim din „190".
 */
export function estimeazaCilindreeDinTitlu(modelCode: string, titlu: string): number | null {
  const text = titlu.toUpperCase();

  if (modelCode === 'W201') {
    const explicit = text.match(/\b(1[.,]8|2[.,]0|2[.,]3|2[.,]5|2[.,]6)\b/);
    return explicit ? Number(explicit[1].replace(',', '.')) : null;
  }

  // ordine „NUMĂR + LITERE" (190E, 230E, 300CE, 500SL, 560SEC, 600SEL)
  const sufix = text.match(/\b(\d{3})\s?(CE|CD|TE|TD|SEL|SEC|SE|SL|E|D)\b/);
  if (sufix) return Number(sufix[1]) / 100;

  // ordine „LITERE + NUMĂR" (SL500, SL 500, SL320, S500) — frecventă la SL/S-Klasse
  const prefix = text.match(/\b(SL|S|CL)\s?(\d{3})\b/);
  if (prefix) return Number(prefix[2]) / 100;

  return null;
}

/**
 * Determină cilindreea pentru un anunț — preferă o mențiune explicită în text
 * („5.0 litri", „5000cc", deja extrasă de Filtru Anti-Fals) peste convenția
 * de denumire, care e doar o aproximare.
 */
export function determinaCilindreeLitri(modelCode: string, titlu: string, note: string | null): number | null {
  const indicii = extrageIndiciiTehnice(`${titlu} ${note ?? ''}`);
  if (indicii.capacitateLitri != null) return indicii.capacitateLitri;
  return estimeazaCilindreeDinTitlu(modelCode, titlu);
}

// ---- Selecție comps + calcul Fair-Value (determinist) ----

export interface ComparableOffer {
  price: number;
  year: number | null;
  cilindreeLitri: number | null;
  bonusDotariRare: number | null;
}

export interface EvaluatorFairValueInput {
  price: number;
  year: number | null;
  cilindreeLitri: number | null;
  bonusDotariRare: number | null;
  comps: ComparableOffer[];
}

export type FairValueEticheta = 'Foarte Ieftin' | 'Ieftin' | 'Moderat' | 'Scump' | 'Foarte Scump';

export interface EvaluatorFairValueOutput {
  dateInsuficiente: boolean;
  fairValuePret: number | null;
  deviatieProcentuala: number | null;
  eticheta: FairValueEticheta | null;
  compsFolosite: number;
}

/** Sub acest prag de comps reale, nu calculăm nicio etichetă — o „Foarte
 * Scump" bazată pe 1-2 anunțuri comparabile ar fi zgomot statistic, nu
 * semnal. Consecvent cu regula „fără date fabricate" a platformei. */
const MIN_COMPS = 3;
/** Nu folosim TOATE comps-urile disponibile, doar cele mai apropiate — un
 * anunț dintr-un an foarte diferit, cu cilindree total diferită, nu ar trebui
 * să tragă în jos/sus fair-value-ul unui anunț atipic pentru grupul lui. */
const MAX_COMPS_FOLOSITE = 5;

// Normalizări — „cât de departe" înseamnă o unitate de distanță pe fiecare
// dimensiune, ca niciuna să nu domine arbitrar calculul doar pentru că are
// o scală numerică mai mare (ani vs. litri vs. puncte bonus 0-10).
const NORMALIZARE_AN = 5;
const NORMALIZARE_CILINDREE = 1;
const NORMALIZARE_BONUS = 5;

interface TintaComparabila {
  year: number | null;
  cilindreeLitri: number | null;
  bonusDotariRare: number | null;
}

function calculeazaDistanta(tinta: TintaComparabila, comp: ComparableOffer): number {
  let suma = 0;
  let dimensiuni = 0;
  if (tinta.year != null && comp.year != null) {
    suma += Math.abs(tinta.year - comp.year) / NORMALIZARE_AN;
    dimensiuni++;
  }
  if (tinta.cilindreeLitri != null && comp.cilindreeLitri != null) {
    suma += Math.abs(tinta.cilindreeLitri - comp.cilindreeLitri) / NORMALIZARE_CILINDREE;
    dimensiuni++;
  }
  if (tinta.bonusDotariRare != null && comp.bonusDotariRare != null) {
    suma += Math.abs(tinta.bonusDotariRare - comp.bonusDotariRare) / NORMALIZARE_BONUS;
    dimensiuni++;
  }
  // Fără nicio dimensiune comparabilă (niciun comp n-are an/cilindree/bonus
  // cunoscute) — tratăm distanța ca „medie", nu ca „cea mai apropiată";
  // altfel un comp complet necunoscut ar părea fals de apropiat (distanță 0).
  return dimensiuni > 0 ? suma / dimensiuni : 1;
}

export function selecteazaCeleMaiApropiateComps(
  tinta: TintaComparabila,
  comps: ComparableOffer[],
  limita: number = MAX_COMPS_FOLOSITE
): ComparableOffer[] {
  return [...comps]
    .map((comp) => ({ comp, distanta: calculeazaDistanta(tinta, comp) }))
    .sort((a, b) => a.distanta - b.distanta)
    .slice(0, limita)
    .map((x) => x.comp);
}

function mediana(valori: number[]): number {
  const sortate = [...valori].sort((a, b) => a - b);
  const mijloc = Math.floor(sortate.length / 2);
  return sortate.length % 2 !== 0 ? sortate[mijloc] : (sortate[mijloc - 1] + sortate[mijloc]) / 2;
}

export function clasificaDeviatie(pret: number, fairValuePret: number): { eticheta: FairValueEticheta; deviatieProcentuala: number } {
  const deviatie = ((pret - fairValuePret) / fairValuePret) * 100;
  const rotunjita = Math.round(deviatie * 10) / 10;
  let eticheta: FairValueEticheta;
  if (deviatie < -25) eticheta = 'Foarte Ieftin';
  else if (deviatie < -10) eticheta = 'Ieftin';
  else if (deviatie <= 10) eticheta = 'Moderat';
  else if (deviatie <= 25) eticheta = 'Scump';
  else eticheta = 'Foarte Scump';
  return { eticheta, deviatieProcentuala: rotunjita };
}

export function evalueazaFairValue(input: EvaluatorFairValueInput): EvaluatorFairValueOutput {
  const compsRelevante = selecteazaCeleMaiApropiateComps(
    { year: input.year, cilindreeLitri: input.cilindreeLitri, bonusDotariRare: input.bonusDotariRare },
    input.comps
  );

  if (compsRelevante.length < MIN_COMPS) {
    return { dateInsuficiente: true, fairValuePret: null, deviatieProcentuala: null, eticheta: null, compsFolosite: compsRelevante.length };
  }

  const fairValuePret = Math.round(mediana(compsRelevante.map((c) => c.price)));
  const { eticheta, deviatieProcentuala } = clasificaDeviatie(input.price, fairValuePret);
  return { dateInsuficiente: false, fairValuePret, deviatieProcentuala, eticheta, compsFolosite: compsRelevante.length };
}

// ---- Definiția agentului (înregistrabil în registry.ts) ----
export const evaluatorFairValueAgent: AgentDefinition<EvaluatorFairValueInput, EvaluatorFairValueOutput> = {
  id: 'evaluator-fair-value',
  name: 'Evaluator de Fair-Value',
  description:
    'Estimează un preț de referință dintr-un set de anunțuri comparabile (același model, an/cilindree/dotări rare apropiate) și clasifică deviația prețului cerut pe o scală de 5 trepte — determinist, fără apel Claude.',
  isConfigured: () => true,
  async run(input) {
    return evalueazaFairValue(input);
  },
};
