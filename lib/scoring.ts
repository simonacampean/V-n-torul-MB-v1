// ============================================================
// Logica de scoring — portată IDENTIC din reference/vanatorul-mercedes-v5.html
// Orice modificare de formulă necesită acordul beneficiarului (v5 = sursa de adevăr).
// ============================================================

export type CondId = '1' | '2' | '3' | '4';
export type Negotiability = 'DA' | 'PARTIAL' | 'NU' | 'REF';
export type Options = 'full' | 'partial' | 'standard';

/** Grade de stare — multiplicator aplicat benzii de preț (v5: CONDS) */
export const CONDS: { id: CondId; label: string; mult: number }[] = [
  { id: '1', label: '#1 Concurs — impecabilă, ca nouă', mult: 1.3 },
  { id: '2', label: '#2 Excelentă — foarte bună, mici semne', mult: 1.0 },
  { id: '3', label: '#3 Bună — funcțională, uzură vizibilă', mult: 0.7 },
  { id: '4', label: '#4 Proiect — necesită lucrări', mult: 0.45 },
];
export const condOf = (id?: string | number) =>
  CONDS.find((c) => c.id === String(id)) ?? CONDS[1];

/** Costuri estimative de aducere în RO pe țară (transport platformă, €) — v5: TRANSPORT.
 *  În producție valorile vin din tabela `transport_costs`; acestea sunt fallback-ul/seed-ul. */
export const TRANSPORT: Record<string, number> = {
  RO: 0, DE: 600, AT: 500, HU: 300, FR: 800, IT: 800, NL: 700, BE: 700,
  ES: 1100, PT: 1200, GR: 1100, UK: 1300, CH: 700, PL: 400, CZ: 400,
};
export const trCost = (c?: string, table: Record<string, number> = TRANSPORT) =>
  table[String(c ?? '').toUpperCase()] ?? 800;

/** Înmatriculare + traduceri + service de intrare (setare globală `reg_cost_eur`) */
export const REG_COST = 900;
/** Pragul de excelență al scorului calitate-preț */
export const EXC_THRESHOLD = 85;
/** Estimarea standard „la cheie" folosită în Lista mea (v5: RO_EXTRA) */
export const RO_EXTRA = 1500;

export const parsePrice = (v: unknown): number | null => {
  const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};

export interface PriceBand { lo: number; hi: number }

export type VerdictKey = 'CHILIPIR' | 'SUB' | 'LA' | 'PESTE';
export interface Verdict {
  key: VerdictKey;
  label: string;
  desc: string;
  lo: number;
  hi: number;
}

/** Verdictul de preț pe grad de stare (v5: verdictOf).
 *  CHILIPIR = sub 85% din pragul inferior al benzii ajustate. */
export function verdictOf(band: PriceBand | null, p: number | null, cond?: string): Verdict | null {
  if (!band || p == null) return null;
  const mult = condOf(cond ?? '2').mult;
  const lo = Math.round(band.lo * mult);
  const hi = Math.round(band.hi * mult);
  if (p < lo * 0.85)
    // P4 — emoție: confirmă câștigul („ai prins-o"), nu doar constată un prag depășit;
    // avertismentul de verificare rămâne, dar ca pas următor, nu ca rezervă principală.
    return { key: 'CHILIPIR', label: '🎯 AI PRINS UN CHILIPIR', desc: `Cu ${Math.round((1 - p / lo) * 100)}% sub prețul corect pentru starea ei — verifică starea reală înainte să confirmi`, lo, hi };
  if (p < lo) return { key: 'SUB', label: 'SUB PIAȚĂ', desc: 'Preț atractiv — verifică de ce', lo, hi };
  if (p <= hi) return { key: 'LA', label: 'LA PIAȚĂ', desc: 'Preț corect pentru starea aleasă', lo, hi };
  return { key: 'PESTE', label: 'PESTE PIAȚĂ', desc: 'Justificat doar de rulaj mic / dotări rare', lo, hi };
}

export interface OfferInput {
  band: PriceBand;            // banda modelului pentru stare #2
  price: number | string;
  cond?: string;
  options?: Options | string;
  history?: boolean;          // istoric verificat
  neg?: Negotiability | string;
  country?: string;
  km?: number | string;
}

/** Scor calitate-preț 0–100 (v5: offerScore):
 *  preț vs bandă(stare) 40 · dotări 15 · istoric 15 · negociere 8 · aducere 12 · km 10 */
export function offerScore(o: OfferInput, transportTable: Record<string, number> = TRANSPORT): number {
  const p = parsePrice(o.price);
  if (!o.band || p == null) return 0;
  const mult = condOf(o.cond ?? '2').mult;
  const lo = o.band.lo * mult;
  const hi = o.band.hi * mult;
  let s = 0;
  s += p <= lo * 0.85 ? 40 : p < lo ? 32 : p <= hi ? 22 : 8;
  const opt = String(o.options ?? '').toLowerCase();
  s += opt === 'full' ? 15 : opt === 'partial' ? 8 : 3;
  s += o.history ? 15 : 0;
  s += o.neg === 'DA' ? 8 : o.neg === 'PARTIAL' ? 4 : 0;
  const t = trCost(o.country, transportTable);
  s += t === 0 ? 12 : t <= 600 ? 9 : t <= 900 ? 6 : 3;
  const km = parsePrice(o.km);
  s += km == null ? 4 : km >= 80000 && km <= 150000 ? 10 : km < 80000 ? 7 : 4;
  return Math.min(100, s);
}

/** Cost total „la cheie" în RO: preț + transport pe țară + înmatriculare */
export function offerTotal(price: number | null, country?: string, table?: Record<string, number>, regCost = REG_COST): number | null {
  if (price == null) return null;
  return price + trCost(country, table) + regCost;
}

// ============================================================
// F-03 — Lista mea: scoring pe 6 criterii ponderate (v5: CRITERIA/score)
// ============================================================
export interface Criterion { id: string; label: string; w: number }

export const CRITERIA: Criterion[] = [
  { id: 'service', label: 'Istoric de service complet (carnet + facturi)', w: 25 },
  { id: 'original', label: '100% piese originale / nemodificată', w: 25 },
  { id: 'tehnic', label: 'Stare tehnică foarte bună (fără rugină structurală)', w: 20 },
  { id: 'km', label: 'Kilometraj real, documentat (ideal 80–150.000 km)', w: 10 },
  { id: 'owners', label: 'Puțini proprietari (1–3) / proveniență clară', w: 10 },
  { id: 'spec', label: 'Specificație dezirabilă (coupé, 6cil/V8, culoare de epocă)', w: 10 },
];

export const STATUSES = [
  'Nou', 'De urmărit', 'Contactat', 'Inspecție programată', 'Ofertă făcută', 'Respins', 'Cumpărat ✓',
] as const;
export type WatchlistStatus = (typeof STATUSES)[number];

export type WatchlistCriteria = Partial<Record<string, boolean>>;

/** Scor 0–100 pe cele 6 criterii bifate ale unui anunț din Lista mea. */
export function scoreWatchlistItem(criteria: WatchlistCriteria | null | undefined): number {
  return CRITERIA.reduce((s, c) => s + (criteria?.[c.id] ? c.w : 0), 0);
}

export const scoreColor = (s: number): string =>
  s >= 80 ? 'var(--green)' : s >= 50 ? 'var(--amber)' : 'var(--inksoft)';

/** Prag de la care un anunț e „★ CANDIDAT" în Lista mea (v5: s>=80). */
export const CANDIDATE_THRESHOLD = 80;
/** Prag de la care numărul de zile pe piață semnalează negociere agresivă (v5: 30+). */
export const STALE_DAYS_THRESHOLD = 30;

export const daysOnMarket = (createdAt: string | Date): number => {
  const t = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
};

export interface PriceHistoryEntry { price: number; at: string }

export const currentPrice = (
  history: PriceHistoryEntry[] | null | undefined,
  fallback: number | null
): number | null => (history && history.length ? history[history.length - 1].price : fallback);

export const firstPrice = (
  history: PriceHistoryEntry[] | null | undefined,
  fallback: number | null
): number | null => (history && history.length ? history[0].price : fallback);

export const priceDropPct = (
  history: PriceHistoryEntry[] | null | undefined,
  fallback: number | null
): number => {
  const first = firstPrice(history, fallback);
  const current = currentPrice(history, fallback);
  if (first == null || current == null || current >= first) return 0;
  return Math.round((1 - current / first) * 100);
};
