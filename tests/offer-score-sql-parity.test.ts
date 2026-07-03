// S-01 — criteriul de acceptare M2 explicit: „scorurile din platformă coincid
// cu formula v5 pe un set de 20 de oferte de test". Verificăm live, pe
// Supabase Cloud, că funcția SQL offer_score() (rulată orar de pg_cron)
// calculează IDENTIC cu offerScore() din lib/scoring.ts (portul JS al v5).
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { offerScore, trCost, TRANSPORT, type OfferInput } from '../lib/scoring';
import { SEED_MODELS } from '../lib/models';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const canRun = Boolean(url && anonKey);

const bandOf = (code: string) => {
  const m = SEED_MODELS.find((x) => x.code === code)!;
  return { lo: m.band_lo, hi: m.band_hi };
};

// 20 de oferte de test, variate pe toate dimensiunile formulei.
const TEST_OFFERS: (OfferInput & { model: string })[] = [
  { model: 'W124', band: bandOf('W124'), price: 8500, cond: '2', options: 'full', history: true, neg: 'DA', country: 'DE', km: 125000 },
  { model: 'R129', band: bandOf('R129'), price: 9000, cond: '2', options: 'full', history: true, neg: 'DA', country: 'RO', km: 100000 },
  { model: 'W140', band: bandOf('W140'), price: 14000, cond: '2', options: 'standard', history: false, neg: 'NU', country: 'UK', km: 220000 },
  { model: 'W124', band: bandOf('W124'), price: 10000, cond: undefined, options: undefined, history: false, neg: 'PARTIAL', country: 'HU', km: undefined },
  { model: 'W201', band: bandOf('W201'), price: 6800, cond: '1', options: 'partial', history: true, neg: 'DA', country: 'RO', km: 60000 },
  { model: 'W126', band: bandOf('W126'), price: 20000, cond: '3', options: 'full', history: true, neg: 'DA', country: 'ES', km: 180000 },
  { model: 'W123', band: bandOf('W123'), price: 7000, cond: '4', options: 'standard', history: false, neg: 'NU', country: 'PT', km: 300000 },
  { model: 'W140', band: bandOf('W140'), price: 5500, cond: '2', options: 'full', history: true, neg: 'DA', country: 'RO', km: 90000 },
  { model: 'R129', band: bandOf('R129'), price: 25000, cond: '1', options: 'full', history: true, neg: 'PARTIAL', country: 'CH', km: 40000 },
  { model: 'W201', band: bandOf('W201'), price: 9500, cond: '2', options: 'partial', history: false, neg: 'DA', country: 'PL', km: 140000 },
  { model: 'W124', band: bandOf('W124'), price: 12000, cond: '2', options: 'standard', history: false, neg: 'DA', country: 'AT', km: 155000 },
  { model: 'W126', band: bandOf('W126'), price: 9000, cond: '3', options: 'partial', history: true, neg: 'PARTIAL', country: 'CZ', km: 210000 },
  { model: 'W123', band: bandOf('W123'), price: 15000, cond: '1', options: 'full', history: true, neg: 'DA', country: 'FR', km: 50000 },
  { model: 'W140', band: bandOf('W140'), price: 8000, cond: '2', options: 'full', history: false, neg: 'NU', country: 'IT', km: 130000 },
  { model: 'R129', band: bandOf('R129'), price: 13500, cond: '2', options: 'standard', history: true, neg: 'DA', country: 'GR', km: 95000 },
  { model: 'W201', band: bandOf('W201'), price: 5000, cond: '4', options: 'standard', history: false, neg: 'NU', country: 'BE', km: 250000 },
  { model: 'W124', band: bandOf('W124'), price: 18500, cond: '2', options: 'full', history: true, neg: 'DA', country: 'NL', km: 70000 },
  { model: 'W126', band: bandOf('W126'), price: 16000, cond: '1', options: 'partial', history: false, neg: 'PARTIAL', country: 'DE', km: 82000 },
  { model: 'W123', band: bandOf('W123'), price: 6500, cond: '3', options: 'standard', history: true, neg: 'DA', country: 'RO', km: 190000 },
  { model: 'W140', band: bandOf('W140'), price: 20000, cond: '1', options: 'full', history: true, neg: 'DA', country: 'XX', km: 30000 },
];

describe.runIf(canRun)('S-01 — paritate scor SQL (offer_score) vs JS (lib/scoring.ts::offerScore)', () => {
  const supabase = createClient(url ?? '', anonKey ?? '', { auth: { persistSession: false } });

  it.each(TEST_OFFERS.map((o, i) => [i + 1, o] as const))('oferta de test #%i', async (_i, offer) => {
    const jsScore = offerScore(offer);

    const { data, error } = await supabase.rpc('offer_score', {
      p_price: offer.price,
      p_cond: offer.cond ?? '2',
      p_band_lo: offer.band.lo,
      p_band_hi: offer.band.hi,
      p_options: offer.options ?? null,
      p_history: Boolean(offer.history),
      p_negotiability: offer.neg ?? null,
      p_transport_cost: trCost(offer.country, TRANSPORT),
      p_km: offer.km ?? null,
    });

    expect(error).toBeNull();
    expect(data).toBe(jsScore);
  });
});

if (!canRun) {
  describe.skip('S-01 — paritate scor SQL vs JS (necesită NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)', () => {
    it('sărit', () => {});
  });
}
