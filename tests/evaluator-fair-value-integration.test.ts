// Testează integrarea Evaluatorului de Fair-Value în fluxul real de import
// (I-02) și acțiunea admin de recalculare — 100% determinist, deci reușește
// mereu, chiar fără ANTHROPIC_API_KEY. NOTĂ: matematica de comps/clasificare
// e deja acoperită exhaustiv, cu control total pe input, în
// tests/evaluator-fair-value.test.ts — testele de-aici verifică DOAR
// cablajul (offers-import scrie coloanele corecte, agent_runs se loghează,
// acțiunea admin recalculează), fără să asume o valoare exactă de
// fair-value — alte teste care rulează în paralel pot insera propriile
// oferte „approved" pentru același model_code, ceea ce ar face fragilă orice
// asertare pe o cifră exactă calculată din comps.
import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { applyImportPlan } from '../lib/server/offers-import';
import type { ValidatedOffer } from '../lib/offers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && serviceKey);

const TITLE_MARKER = 'TEST-EVALUATOR-FAIR-VALUE Mercedes 300CE';

function ofertaValidata(overrides: Partial<ValidatedOffer> = {}): ValidatedOffer {
  return {
    model_code: 'W124',
    title: TITLE_MARKER,
    price: 12000,
    url: null,
    year: 1990,
    km: 150000,
    cond: '2',
    options: 'standard',
    history_verified: true,
    negotiability: 'DA',
    country: 'DE',
    note: 'Mașină în stare bună, fără modificări.',
    ...overrides,
  };
}

describe.runIf(canRun)('Evaluator de Fair-Value — integrare în applyImportPlan (I-02)', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId: string;
  const createdOfferIds: string[] = [];

  afterEach(async () => {
    if (createdOfferIds.length) {
      await admin.from('agent_runs').delete().in('related_offer_id', createdOfferIds);
      await admin.from('offer_price_history').delete().in('offer_id', createdOfferIds);
      await admin.from('offers').delete().in('id', createdOfferIds);
      createdOfferIds.length = 0;
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it('extrage cilindreea din titlu („300CE" → 3.0L) și rulează agentul, indiferent de `note`', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-fair-value-import-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = { toInsert: [ofertaValidata()], toUpdate: [] };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,cilindree_litri,fair_value_comps_folosite,fair_value_actualizat_la')
      .ilike('title', `${TITLE_MARKER}%`)
      .single();
    expect(offer).not.toBeNull();
    createdOfferIds.push(offer!.id);

    expect(offer!.cilindree_litri).toBe(3.0);
    expect(offer!.fair_value_actualizat_la).not.toBeNull();
    expect(offer!.fair_value_comps_folosite).toBeGreaterThanOrEqual(0);

    const { data: run } = await admin
      .from('agent_runs')
      .select('status,trigger_source')
      .eq('agent_id', 'evaluator-fair-value')
      .eq('related_offer_id', offer!.id)
      .single();
    expect(run!.status).toBe('success'); // determinist — mereu succes, fără cheie API
    expect(run!.trigger_source).toBe('import_oferte');
  });

  it('rulează chiar și fără `note` (spre deosebire de ceilalți agenți — nu are nevoie de text liber)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-fair-value-import-fara-note-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = { toInsert: [ofertaValidata({ title: `${TITLE_MARKER}-FARA-NOTE`, note: null })], toUpdate: [] };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,cilindree_litri')
      .ilike('title', `${TITLE_MARKER}-FARA-NOTE%`)
      .single();
    createdOfferIds.push(offer!.id);
    expect(offer!.cilindree_litri).toBe(3.0); // tot extrasă din titlu, fără nicio notă

    const { count } = await admin
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', 'evaluator-fair-value')
      .eq('related_offer_id', offer!.id);
    expect(count).toBe(1); // spre deosebire de Arheologul/Calculator, rulează oricum
  });
});

describe.runIf(canRun)('Evaluator de Fair-Value — acțiunea admin de recalculare', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId: string;
  const createdOfferIds: string[] = [];

  afterEach(async () => {
    if (createdOfferIds.length) {
      await admin.from('agent_runs').delete().in('related_offer_id', createdOfferIds);
      await admin.from('offers').delete().in('id', createdOfferIds);
      createdOfferIds.length = 0;
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it('recalculeazaFairValue rulează din nou agentul și actualizează fair_value_actualizat_la', async () => {
    const { calculeazaFairValuePentruOferta } = await import('../lib/server/offers-import');
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-fair-value-recalc-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = { toInsert: [ofertaValidata({ title: `${TITLE_MARKER}-RECALC` })], toUpdate: [] };
    await applyImportPlan(admin, plan, userId);
    const { data: offer } = await admin
      .from('offers')
      .select('id,model_code,title,note,price,year,bonus_dotari_rare,fair_value_actualizat_la')
      .ilike('title', `${TITLE_MARKER}-RECALC%`)
      .single();
    createdOfferIds.push(offer!.id);
    const primaActualizare = offer!.fair_value_actualizat_la;
    expect(primaActualizare).not.toBeNull();

    await new Promise((r) => setTimeout(r, 10));
    await calculeazaFairValuePentruOferta(
      admin,
      offer!.id,
      { model_code: offer!.model_code, title: offer!.title, note: offer!.note, price: offer!.price, year: offer!.year },
      offer!.bonus_dotari_rare,
      'manual_admin'
    );

    const { data: dupaRecalculare } = await admin
      .from('offers')
      .select('fair_value_actualizat_la')
      .eq('id', offer!.id)
      .single();
    expect(new Date(dupaRecalculare!.fair_value_actualizat_la).getTime()).toBeGreaterThan(new Date(primaActualizare).getTime());

    const { count } = await admin
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', 'evaluator-fair-value')
      .eq('related_offer_id', offer!.id)
      .eq('trigger_source', 'manual_admin');
    expect(count).toBe(1); // rularea manuală s-a logat distinct de cea automată de la import
  });
});

if (!canRun) {
  describe.skip('Evaluator de Fair-Value — integrare (necesită SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
