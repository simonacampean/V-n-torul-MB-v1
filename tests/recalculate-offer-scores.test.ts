// Regresie pentru un bug real, preexistent (descoperit la conectarea
// bonus_dotari_rare — migrarea 0018): recalculate_offer_scores() eșua la
// FIECARE execuție cu „invalid reference to FROM-clause entry for table o"
// (LEFT JOIN pe transport_costs referea alias-ul țintei UPDATE, interzis în
// PostgreSQL), lăsând TOATE ofertele active cu score=0/excellent=false —
// inclusiv cele rulate orar prin pg_cron. Niciun test nu verifica până acum
// offers.score după recalculare (doar offer_score() izolat, în
// offer-score-sql-parity.test.ts) — acest test închide golul.
import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { offerScore } from '../lib/scoring';
import { SEED_MODELS } from '../lib/models';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && serviceKey);

const TITLE_MARKER = 'TEST-RECALCULATE-SCORES Mercedes W124';

describe.runIf(canRun)('recalculate_offer_scores() — nu trebuie să eșueze, scorul real trebuie să fie corect', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const createdOfferIds: string[] = [];

  afterEach(async () => {
    if (createdOfferIds.length) {
      await admin.from('offers').delete().in('id', createdOfferIds);
      createdOfferIds.length = 0;
    }
  });

  it('rulează fără eroare și calculează un scor real (nu 0) pentru o ofertă activă', async () => {
    const w124 = SEED_MODELS.find((m) => m.code === 'W124')!;

    const { data: offer, error: insErr } = await admin
      .from('offers')
      .insert({
        model_code: 'W124',
        title: TITLE_MARKER,
        price: 8500,
        cond: '2',
        options: 'full',
        history_verified: true,
        negotiability: 'DA',
        country: 'DE',
        km: 125000,
        moderation: 'approved',
        status: 'active',
      })
      .select('id')
      .single();
    expect(insErr).toBeNull();
    createdOfferIds.push(offer!.id);

    const { error: rpcErr } = await admin.rpc('recalculate_offer_scores');
    expect(rpcErr).toBeNull(); // regresie directă a bugului: acest apel arunca eroare la fiecare rulare

    const { data: reloaded } = await admin.from('offers').select('score,excellent').eq('id', offer!.id).single();
    const scorAsteptat = offerScore({
      band: { lo: w124.band_lo, hi: w124.band_hi },
      price: 8500, cond: '2', options: 'full', history: true, neg: 'DA', country: 'DE', km: 125000,
    });
    expect(reloaded!.score).toBe(scorAsteptat);
    expect(reloaded!.score).toBeGreaterThan(0);
  });
});

if (!canRun) {
  describe.skip('recalculate_offer_scores() (necesită SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
