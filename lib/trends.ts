// ============================================================
// Grafic de Trend pe 5 Ani — sursa: tabela `model_macro_trends` (Supabase).
// Fără fallback pe date generate: dacă tabela e goală sau env-ul lipsește,
// întoarcem un map gol și componenta de grafic se ascunde (vezi migrarea
// 0023 — populare doar din /admin/tendinte, cu sursă documentată).
// ============================================================
import { createClient } from '@supabase/supabase-js';

export interface TrendPoint {
  an: number;
  pret: number;
}

/** O singură interogare per randare de pagină (tabelă mică, ≤ 6 modele ×
 * câțiva ani) — apelanții (homepage, /oferte, /cont/lista) o cheamă o
 * dată și distribuie rezultatul pe toate cardurile, nu re-interoghează per card. */
export async function getModelTrends(): Promise<Record<string, TrendPoint[]>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {};
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('model_macro_trends')
      .select('model_code,an_calendaristic,pret_mediu_estimat')
      .order('an_calendaristic');
    if (error || !data?.length) return {};
    const byModel: Record<string, TrendPoint[]> = {};
    for (const row of data) {
      const arr = byModel[row.model_code] ?? (byModel[row.model_code] = []);
      arr.push({ an: row.an_calendaristic, pret: row.pret_mediu_estimat });
    }
    return byModel;
  } catch {
    return {};
  }
}

/** Punctele ordonate crescător după an — sursa de adevăr pentru orice calcul
 * sau randare (datele din DB nu garantează ordinea, deși query-ul le cere sortate). */
export function sortedTrendPoints(data: TrendPoint[]): TrendPoint[] {
  return [...data].sort((a, b) => a.an - b.an);
}

/** Creștere procentuală de la primul la ultimul an disponibil. `null` sub 2
 * puncte sau când primul preț e 0 (împărțire nedefinită) — apelantul trebuie
 * să ascundă graficul în ambele cazuri, nu doar la lipsă totală de date. */
export function trendGrowthPct(data: TrendPoint[]): number | null {
  if (data.length < 2) return null;
  const points = sortedTrendPoints(data);
  const first = points[0].pret;
  const last = points[points.length - 1].pret;
  if (first <= 0) return null;
  return Math.round(((last - first) / first) * 100);
}
