// Testează integrarea Filtrului Anti-Fals în fluxul real de import (I-02)
// — applyImportPlan trebuie să insereze anunțul indiferent de rezultatul
// agentului (best-effort), și să declanșeze o execuție reală logată în
// agent_runs pentru un anunț cu insignă flagship revendicată.
import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { applyImportPlan } from '../lib/server/offers-import';
import type { ValidatedOffer } from '../lib/offers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && serviceKey);

const TITLE_MARKER = 'TEST-FILTRU-ANTI-FALS Mercedes E500 AMG W124';
const TITLE_MARKER_CLEAN = 'TEST-FILTRU-ANTI-FALS-CLEAN Mercedes 230E';

function ofertaValidata(overrides: Partial<ValidatedOffer> = {}): ValidatedOffer {
  return {
    model_code: 'W124',
    title: TITLE_MARKER,
    price: 45000,
    url: null,
    year: 1993,
    km: 120000,
    cond: '2',
    options: 'full',
    history_verified: true,
    negotiability: 'DA',
    country: 'DE',
    note: 'Motorul este de 2.0 litri diesel, foarte economic.',
    ...overrides,
  };
}

describe.runIf(canRun)('Filtru Anti-Fals — integrare în applyImportPlan (I-02)', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId: string;
  // Curățare pe id-uri exacte capturate direct în teste — NU printr-un nou
  // SELECT ilike în afterEach (acela a lăsat rânduri orfane în agent_runs
  // într-o rulare anterioară: related_offer_id ajunge NULL prin ON DELETE
  // SET NULL dacă offers e șters înainte ca delete-ul pe agent_runs să prindă
  // id-ul corect — cu id-ul cunoscut dinainte, ordinea nu mai contează).
  const createdOfferIds: string[] = [];

  afterEach(async () => {
    if (createdOfferIds.length) {
      const { error: e1 } = await admin.from('agent_runs').delete().in('related_offer_id', createdOfferIds);
      const { error: e2 } = await admin.from('offer_price_history').delete().in('offer_id', createdOfferIds);
      const { error: e3 } = await admin.from('offers').delete().in('id', createdOfferIds);
      if (e1 || e2 || e3) throw e1 ?? e2 ?? e3;
      createdOfferIds.length = 0;
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it('inserează anunțul și rulează Filtru Anti-Fals best-effort (nu blochează importul)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-filtru-import-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = { toInsert: [ofertaValidata()], toUpdate: [] };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,autenticitate_pachet,filtru_anti_fals_detalii')
      .ilike('title', `${TITLE_MARKER}%`)
      .single();
    expect(offer).not.toBeNull();
    createdOfferIds.push(offer!.id);

    const { data: run } = await admin
      .from('agent_runs')
      .select('agent_id,status,trigger_source,related_offer_id')
      .eq('agent_id', 'filtru-anti-fals')
      .eq('related_offer_id', offer!.id)
      .maybeSingle();
    // Anunțul revendică insigna „e500" — există mereu o insignă de analizat,
    // deci agentul TREBUIE să încerce un apel (succes sau eroare, nu scurtcircuit).
    expect(run).not.toBeNull();
    expect(run!.trigger_source).toBe('import_oferte');
    expect(['success', 'error']).toContain(run!.status);
    if (run!.status === 'success') {
      expect(['Original', 'Modificat', 'Replica', 'Suspicios']).toContain(offer!.autenticitate_pachet);
    }
  });

  it('rezolvă instant „Original" fără apel Claude pentru un anunț fără insignă/sintagmă suspectă (scurtcircuit determinist)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `test-filtru-import-clean-${Date.now()}@example.com`,
      password: 'TestParola123!',
      email_confirm: true,
    });
    userId = created!.user!.id;

    const plan = {
      toInsert: [
        ofertaValidata({
          title: TITLE_MARKER_CLEAN,
          note: 'Mașină în stare bună, km reali, service la zi.',
        }),
      ],
      toUpdate: [],
    };
    const result = await applyImportPlan(admin, plan, userId);
    expect(result.inserted).toBe(1);

    const { data: offer } = await admin
      .from('offers')
      .select('id,autenticitate_pachet')
      .ilike('title', `${TITLE_MARKER_CLEAN}%`)
      .single();
    expect(offer!.autenticitate_pachet).toBe('Original');
    createdOfferIds.push(offer!.id);

    // Scurtcircuitul e intern agentului (fără apel Claude) — orchestratorul tot
    // loghează rularea, dar mereu ca succes, indiferent de ANTHROPIC_API_KEY.
    const { data: run } = await admin
      .from('agent_runs')
      .select('status')
      .eq('agent_id', 'filtru-anti-fals')
      .eq('related_offer_id', offer!.id)
      .single();
    expect(run!.status).toBe('success');
  });
});

if (!canRun) {
  describe.skip('Filtru Anti-Fals — integrare (necesită SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
