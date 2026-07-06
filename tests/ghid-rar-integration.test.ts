// Testează integrarea Ghidului RAR în fluxul real de import (I-02) —
// applyImportPlan trebuie să insereze anunțul indiferent de rezultatul
// agentului (best-effort), și să ruleze Ghidul RAR după Filtru Anti-Fals.
import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { applyImportPlan } from '../lib/server/offers-import';
import type { ValidatedOffer } from '../lib/offers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && serviceKey);

const anCurent = new Date().getFullYear();
const TITLE_MARKER = 'TEST-GHID-RAR Mercedes W126 vechi';

function ofertaValidata(overrides: Partial<ValidatedOffer> = {}): ValidatedOffer {
  return {
    model_code: 'W126',
    title: TITLE_MARKER,
    price: 12000,
    url: null,
    year: anCurent - 40,
    km: 180000,
    cond: '2',
    options: 'full',
    history_verified: true,
    negotiability: 'DA',
    country: 'DE',
    note: 'Wagen in gutem Zustand, Motor läuft einwandfrei, Serviceheft komplett.',
    ...overrides,
  };
}

describe.runIf(canRun)('Ghidul RAR — integrare în applyImportPlan (I-02)', () => {
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

  it('rulează Ghidul RAR după Filtru Anti-Fals pentru un vehicul suficient de vechi', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-ghid-rar-import-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = { toInsert: [ofertaValidata()], toUpdate: [] };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,eligibilitate_rar,rezumat_ro')
      .ilike('title', `${TITLE_MARKER}%`)
      .single();
    expect(offer).not.toBeNull();
    createdOfferIds.push(offer!.id);

    const { data: run } = await admin
      .from('agent_runs')
      .select('status,trigger_source')
      .eq('agent_id', 'ghid-rar')
      .eq('related_offer_id', offer!.id)
      .maybeSingle();
    expect(run).not.toBeNull();
    expect(run!.trigger_source).toBe('import_oferte');
    expect(['success', 'error']).toContain(run!.status);
    if (run!.status === 'success') {
      expect(['Eligibil', 'Neeligibil', 'Incert']).toContain(offer!.eligibilitate_rar);
    }
  });

  it('vehicul prea tânăr, FĂRĂ text ⇒ Neeligibil instant, fără niciun apel Claude (scurtcircuit determinist)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-ghid-rar-tanar-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = {
      toInsert: [
        ofertaValidata({
          title: `${TITLE_MARKER}-TANAR`,
          year: anCurent - 5,
          note: null,
        }),
      ],
      toUpdate: [],
    };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,eligibilitate_rar')
      .ilike('title', `${TITLE_MARKER}-TANAR%`)
      .single();
    createdOfferIds.push(offer!.id);
    expect(offer!.eligibilitate_rar).toBe('Neeligibil');

    const { data: run } = await admin
      .from('agent_runs')
      .select('status')
      .eq('agent_id', 'ghid-rar')
      .eq('related_offer_id', offer!.id)
      .single();
    expect(run!.status).toBe('success'); // scurtcircuit determinist — mereu succes, chiar fără cheie API
  });
});

if (!canRun) {
  describe.skip('Ghidul RAR — integrare (necesită SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
