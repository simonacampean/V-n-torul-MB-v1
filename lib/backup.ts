// ============================================================
// F-07 — Export/import backup JSON. Acceptă atât formatul propriu (export din
// v2.0), cât și formatul vechi din v5 (localStorage) — cerință explicită de
// acceptare M1: "importă backup-ul v5 și își regăsește lista".
// ============================================================
import { parsePrice, STATUSES, type WatchlistStatus } from './scoring';

export interface BackupWatchlistRow {
  model_code: string;
  title: string;
  price: number | null;
  url: string | null;
  year: number | null;
  km: number | null;
  note: string | null;
  cond: string;
  status: string;
  criteria: Record<string, boolean>;
  price_history: { price: number; at: string }[];
  created_at: string;
}

export interface BackupFile {
  app: 'VanatorulMB';
  exported: string;
  listings: BackupWatchlistRow[];
}

/** „03.07.2026" (v5, ro-RO) → „2026-07-03". Null dacă formatul nu se potrivește. */
export function ddmmyyyyToIso(s: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

const COND_IDS = ['1', '2', '3', '4'];

export interface NormalizeResult {
  rows: BackupWatchlistRow[];
  errors: string[];
}

/**
 * Normalizează un backup (propriu sau v5 legacy) într-o listă de rânduri gata
 * de inserat. Detectează formatul per-rând: v5 are `model`/`crit`/`priceHist`,
 * formatul propriu are `model_code`/`criteria`/`price_history`.
 */
export function normalizeBackupListings(
  raw: unknown,
  validModelCodes: string[]
): NormalizeResult | { error: string } {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { listings?: unknown }).listings)) {
    return { error: 'Fișier invalid — folosește un backup exportat din aplicație.' };
  }

  const listings = (raw as { listings: unknown[] }).listings;
  const rows: BackupWatchlistRow[] = [];
  const errors: string[] = [];

  listings.forEach((item, i) => {
    const rowNum = i + 1;
    if (!item || typeof item !== 'object') {
      errors.push(`Rândul ${rowNum}: format invalid.`);
      return;
    }
    const it = item as Record<string, unknown>;
    const isV5 = typeof it.model === 'string' && it.model_code === undefined;
    const modelCode = String(isV5 ? it.model : (it.model_code ?? ''));

    if (!validModelCodes.includes(modelCode)) {
      errors.push(`Rândul ${rowNum}: model necunoscut (${modelCode || '—'}).`);
      return;
    }
    const title = String(it.title ?? '').trim();
    if (!title) {
      errors.push(`Rândul ${rowNum}: fără titlu.`);
      return;
    }

    const price = parsePrice(it.price as string | number | undefined);
    const year = parsePrice(it.year as string | number | undefined);
    const km = parsePrice(it.km as string | number | undefined);
    const cond = COND_IDS.includes(String(it.cond)) ? String(it.cond) : '2';
    const status = STATUSES.includes(String(it.status) as WatchlistStatus) ? String(it.status) : 'Nou';

    let criteria: Record<string, boolean> = {};
    let priceHistory: { price: number; at: string }[] = [];
    let createdAt = new Date().toISOString();

    if (isV5) {
      const crit = it.crit;
      criteria = crit && typeof crit === 'object' ? (crit as Record<string, boolean>) : {};
      const hist = Array.isArray(it.priceHist) ? it.priceHist : [];
      priceHistory = (hist as { p?: unknown; d?: unknown }[]).map((h) => ({
        price: parsePrice(h.p as string | number | undefined) ?? 0,
        at: (typeof h.d === 'string' && ddmmyyyyToIso(h.d)) || new Date().toISOString().slice(0, 10),
      }));
      const addedIso = typeof it.added === 'string' ? ddmmyyyyToIso(it.added) : null;
      if (addedIso) createdAt = `${addedIso}T00:00:00.000Z`;
    } else {
      const crit = it.criteria;
      criteria = crit && typeof crit === 'object' ? (crit as Record<string, boolean>) : {};
      const hist = Array.isArray(it.price_history) ? it.price_history : [];
      priceHistory = (hist as { price?: unknown; at?: unknown }[]).map((h) => ({
        price: parsePrice(h.price as string | number | undefined) ?? 0,
        at: typeof h.at === 'string' ? h.at : new Date().toISOString().slice(0, 10),
      }));
      if (typeof it.created_at === 'string') createdAt = it.created_at;
    }

    rows.push({
      model_code: modelCode,
      title,
      price,
      url: (typeof it.url === 'string' && it.url) || null,
      year,
      km,
      note: (typeof it.note === 'string' && it.note) || null,
      cond,
      status,
      criteria,
      price_history: priceHistory,
      created_at: createdAt,
    });
  });

  return { rows, errors };
}
