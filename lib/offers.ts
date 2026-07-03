// ============================================================
// I-02 — import raportul agentului (formatul exact din v5: {generated, offers[]}).
// I-05 — deduplicare pe URL canonic + fingerprint (model, an, km±5%, preț±5%).
// ============================================================
import { parsePrice } from './scoring';

const COND_IDS = ['1', '2', '3', '4'];
const OPTIONS_IDS = ['full', 'partial', 'standard'];
const NEG_IDS = ['DA', 'PARTIAL', 'NU'];

export interface ValidatedOffer {
  model_code: string;
  title: string;
  price: number;
  url: string | null;
  year: number | null;
  km: number | null;
  cond: string;
  options: string;
  history_verified: boolean;
  negotiability: string;
  country: string;
  note: string | null;
}

/**
 * Extrage blocul JSON din text (agentul poate trimite text liber + JSON
 * amestecate — v5 caută mereu primul „{...}", nu presupune JSON pur).
 */
export function extractAgentReport(text: string): { generated?: string; offers: unknown[] } | { error: string } {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) {
    return { error: 'Nu am găsit un bloc JSON valid. Lipește raportul agentului exact cum l-a generat (conține {"offers":[...]}).' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { error: 'Nu am găsit un bloc JSON valid. Lipește raportul agentului exact cum l-a generat (conține {"offers":[...]}).' };
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { offers?: unknown }).offers)) {
    return { error: 'Format invalid — lipsește array-ul "offers".' };
  }
  const report = parsed as { generated?: string; offers: unknown[] };
  if (!report.offers.length) {
    return { error: 'Raportul nu conține nicio ofertă.' };
  }
  return report;
}

/** Validează + normalizează ofertele brute (v5: filtrul din A.importAgent). */
export function validateOffers(
  rawOffers: unknown[],
  validModelCodes: string[]
): { valid: ValidatedOffer[]; skipped: number } {
  const valid: ValidatedOffer[] = [];
  let skipped = 0;

  for (const item of rawOffers) {
    if (!item || typeof item !== 'object') {
      skipped++;
      continue;
    }
    const o = item as Record<string, unknown>;
    const modelCode = String(o.model ?? '');
    const title = String(o.title ?? '').trim();
    const price = parsePrice(o.price as string | number | undefined);

    if (!title || !validModelCodes.includes(modelCode) || price == null) {
      skipped++;
      continue;
    }

    valid.push({
      model_code: modelCode,
      title,
      price,
      url: (typeof o.url === 'string' && o.url) || null,
      year: parsePrice(o.year as string | number | undefined),
      km: parsePrice(o.km as string | number | undefined),
      cond: COND_IDS.includes(String(o.cond)) ? String(o.cond) : '2',
      options: OPTIONS_IDS.includes(String(o.options).toLowerCase()) ? String(o.options).toLowerCase() : 'standard',
      history_verified: Boolean(o.history),
      negotiability: NEG_IDS.includes(String(o.neg)) ? String(o.neg) : 'DA',
      country: (typeof o.country === 'string' && o.country.toUpperCase()) || 'DE',
      note: (typeof o.note === 'string' && o.note) || null,
    });
  }

  return { valid, skipped };
}

/** Bucket de căutare rapidă pentru fingerprint (model + an) — I-05. */
export function fingerprintOf(modelCode: string, year: number | null): string {
  return `${modelCode}|${year ?? '?'}`;
}

/** Km/preț ±5% — două anunțuri „aceeași mașină" chiar dacă vin din surse diferite. */
export function isCloseMatch(
  a: { price: number; km: number | null },
  b: { price: number; km: number | null }
): boolean {
  const priceOk = Math.abs(a.price - b.price) <= a.price * 0.05;
  if (!priceOk) return false;
  if (a.km == null || b.km == null) return true;
  return Math.abs(a.km - b.km) <= Math.max(a.km, b.km, 1) * 0.05;
}

export interface ExistingOfferLite {
  id: string;
  model_code: string;
  year: number | null;
  price: number;
  km: number | null;
  url: string | null;
}

export interface ImportPlan {
  toInsert: ValidatedOffer[];
  toUpdate: { id: string; price: number; priceChanged: boolean }[];
}

/**
 * Decide, pentru fiecare ofertă validată din raport, dacă e o ofertă nouă
 * (insert) sau deja cunoscută (update last_seen/preț) — pe URL exact întâi,
 * apoi pe fingerprint + km/preț ±5% (I-05). Funcție pură, fără efecte:
 * garantează testabil că reimportul aceluiași raport nu creează duplicate.
 */
export function planOfferImport(incoming: ValidatedOffer[], existing: ExistingOfferLite[]): ImportPlan {
  const byUrl = new Map(existing.filter((o) => o.url).map((o) => [o.url as string, o]));
  const byFingerprint = new Map<string, ExistingOfferLite[]>();
  existing.forEach((o) => {
    const fp = fingerprintOf(o.model_code, o.year);
    const arr = byFingerprint.get(fp) ?? [];
    arr.push(o);
    byFingerprint.set(fp, arr);
  });

  const toInsert: ValidatedOffer[] = [];
  const toUpdate: ImportPlan['toUpdate'] = [];

  for (const offer of incoming) {
    let match = offer.url ? byUrl.get(offer.url) : undefined;
    if (!match) {
      const candidates = byFingerprint.get(fingerprintOf(offer.model_code, offer.year)) ?? [];
      match = candidates.find((c) => isCloseMatch({ price: offer.price, km: offer.km }, { price: c.price, km: c.km }));
    }
    if (match) {
      toUpdate.push({ id: match.id, price: offer.price, priceChanged: match.price !== offer.price });
    } else {
      toInsert.push(offer);
    }
  }

  return { toInsert, toUpdate };
}
