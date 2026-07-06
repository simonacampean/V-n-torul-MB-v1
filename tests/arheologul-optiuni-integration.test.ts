// Testează integrarea Arheologului de Opțiuni în fluxul real de import
// (I-02) — spre deosebire de ceilalți agenți, acesta e 100% determinist,
// deci reușește mereu, chiar fără ANTHROPIC_API_KEY.
import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { applyImportPlan } from '../lib/server/offers-import';
import type { ValidatedOffer } from '../lib/offers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && serviceKey);

const TITLE_MARKER = 'TEST-ARHEOLOGUL-OPTIUNI Mercedes W124';

function ofertaValidata(overrides: Partial<ValidatedOffer> = {}): ValidatedOffer {
  return {
    model_code: 'W124',
    title: TITLE_MARKER,
    price: 12000,
    url: null,
    year: 1993,
    km: 150000,
    cond: '2',
    options: 'full',
    history_verified: true,
    negotiability: 'DA',
    country: 'DE',
    note: 'Ausstattung: Sportline, Schiebedach, Klimaautomatik, Velours, original Becker Radio.',
    ...overrides,
  };
}

describe.runIf(canRun)('Arheologul de Opțiuni — integrare în applyImportPlan (I-02)', () => {
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

  it('detectează dotările reale, calculează bonusul și îl stochează (fără să afecteze scorul real)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-arheologul-import-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = { toInsert: [ofertaValidata()], toUpdate: [] };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,score,dotari_rare_detectate,nota_raritate,bonus_dotari_rare')
      .ilike('title', `${TITLE_MARKER}%`)
      .single();
    expect(offer).not.toBeNull();
    createdOfferIds.push(offer!.id);

    expect(offer!.dotari_rare_detectate).toHaveLength(4); // Sportline, Schiebedach, Klimaautomatik, Velours
    expect(offer!.bonus_dotari_rare).toBe(5);
    expect(offer!.nota_raritate).toMatch(/premium/i);

    const { data: run } = await admin
      .from('agent_runs')
      .select('status,trigger_source')
      .eq('agent_id', 'arheologul-optiuni')
      .eq('related_offer_id', offer!.id)
      .single();
    expect(run!.status).toBe('success'); // determinist — mereu succes, fără cheie API
    expect(run!.trigger_source).toBe('import_oferte');
  });

  it('nu rulează deloc dacă anunțul nu are note de analizat', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-arheologul-import-fara-note-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = { toInsert: [ofertaValidata({ title: `${TITLE_MARKER}-FARA-NOTE`, note: null })], toUpdate: [] };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,bonus_dotari_rare')
      .ilike('title', `${TITLE_MARKER}-FARA-NOTE%`)
      .single();
    createdOfferIds.push(offer!.id);
    expect(offer!.bonus_dotari_rare).toBeNull();

    const { count } = await admin
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', 'arheologul-optiuni')
      .eq('related_offer_id', offer!.id);
    expect(count).toBe(0);
  });
});

if (!canRun) {
  describe.skip('Arheologul de Opțiuni — integrare (necesită SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
