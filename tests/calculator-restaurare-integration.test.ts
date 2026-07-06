// Testează integrarea Calculatorului de Restaurare în fluxul real de import
// (I-02) — applyImportPlan trebuie să insereze anunțul indiferent de
// rezultatul agentului (best-effort).
import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { applyImportPlan } from '../lib/server/offers-import';
import type { ValidatedOffer } from '../lib/offers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && serviceKey);

const TITLE_MARKER = 'TEST-CALCULATOR-RESTAURARE Mercedes W124';

function ofertaValidata(overrides: Partial<ValidatedOffer> = {}): ValidatedOffer {
  return {
    model_code: 'W124',
    title: TITLE_MARKER,
    price: 9500,
    url: null,
    year: 1993,
    km: 150000,
    cond: '2',
    options: 'full',
    history_verified: true,
    negotiability: 'DA',
    country: 'DE',
    note: 'Câteva puncte de rugină la praguri, aerul nu funcționează. Rest impecabil.',
    ...overrides,
  };
}

describe.runIf(canRun)('Calculator de Restaurare — integrare în applyImportPlan (I-02)', () => {
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

  it('detectează problemele reale și calculează bugetul (best-effort, nu blochează importul)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-calculator-restaurare-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = { toInsert: [ofertaValidata()], toUpdate: [] };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,buget_reimprospatare_estimat,detaliere_necesitati,mesaj_atentionare')
      .ilike('title', `${TITLE_MARKER}%`)
      .single();
    expect(offer).not.toBeNull();
    createdOfferIds.push(offer!.id);

    const { data: run } = await admin
      .from('agent_runs')
      .select('status,trigger_source')
      .eq('agent_id', 'calculator-restaurare')
      .eq('related_offer_id', offer!.id)
      .maybeSingle();
    expect(run).not.toBeNull();
    expect(run!.trigger_source).toBe('import_oferte');
    expect(['success', 'error']).toContain(run!.status);
    if (run!.status === 'success') {
      // 250+400 (climă) + 400+800 (rugină) + 300+300 (revizie) = 950-1500
      expect(offer!.buget_reimprospatare_estimat).toBe('950€ - 1.500€');
      expect(offer!.detaliere_necesitati).toHaveLength(3); // climă + rugină + revizie obligatorie
    }
  });

  it('nu rulează deloc dacă anunțul nu are note de analizat', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-calculator-restaurare-fara-note-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = { toInsert: [ofertaValidata({ title: `${TITLE_MARKER}-FARA-NOTE`, note: null })], toUpdate: [] };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,buget_reimprospatare_estimat')
      .ilike('title', `${TITLE_MARKER}-FARA-NOTE%`)
      .single();
    createdOfferIds.push(offer!.id);
    expect(offer!.buget_reimprospatare_estimat).toBeNull();

    const { count } = await admin
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', 'calculator-restaurare')
      .eq('related_offer_id', offer!.id);
    expect(count).toBe(0);
  });
});

if (!canRun) {
  describe.skip('Calculator de Restaurare — integrare (necesită SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
