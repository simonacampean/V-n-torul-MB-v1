// Scriere efectivă în DB pentru un plan de import (I-02) — extras din
// server actions ca să fie reutilizabil atât pentru importul manual
// (app/cont/oferte/actions.ts), cât și pentru aprobarea draft-urilor
// generate de rutina Claude programată (app/admin/oferte/actions.ts).
import type { SupabaseClient } from '@supabase/supabase-js';
import { fingerprintOf, type ImportPlan } from '@/lib/offers';
import { runAgent } from '@/lib/agents/orchestrator';
import type { RaportAutenticitate } from '@/lib/agents/detectiv-autenticitate';
import type { FiltruAntiFalsInput, FiltruAntiFalsOutput } from '@/lib/agents/filtru-anti-fals';
import type { GhidRarInput, GhidRarOutput } from '@/lib/agents/ghid-rar';

/** Verificare automată de autenticitate (Detectivul de Autenticitate) — rulează
 * DOAR dacă anunțul are un `note` de analizat, și e strict best-effort: un eșec
 * (ex. ANTHROPIC_API_KEY neconfigurat) nu blochează niciodată importul, doar
 * lasă scorul necompletat pe acel anunț. */
async function verificaAutenticitate(admin: SupabaseClient, offerId: string, note: string | null): Promise<void> {
  if (!note?.trim()) return;
  const result = await runAgent<{ descriere: string }, RaportAutenticitate>(
    'detectiv-autenticitate',
    { descriere: note },
    { triggerSource: 'import_oferte', relatedOfferId: offerId }
  );
  if (!result.ok) return;
  await admin
    .from('offers')
    .update({ risc_autenticitate_scor: result.data.scor_risc, risc_autenticitate_detalii: result.data })
    .eq('id', offerId);
}

/** Filtru Anti-Fals (Replica Detector) — la fel de best-effort ca verificaAutenticitate;
 * rulează pe fiecare anunț importat (agentul însuși scurtcircuitează, fără apel Claude,
 * dacă nu găsește nicio insignă flagship sau sintagmă suspectă). Întoarce verdictul (dacă
 * a reușit) ca să-l poată reutiliza Ghidul RAR, fără o a doua analiză independentă. */
async function verificaFiltruAntiFals(
  admin: SupabaseClient,
  offerId: string,
  input: FiltruAntiFalsInput
): Promise<FiltruAntiFalsOutput | null> {
  const result = await runAgent<FiltruAntiFalsInput, FiltruAntiFalsOutput>('filtru-anti-fals', input, {
    triggerSource: 'import_oferte',
    relatedOfferId: offerId,
  });
  if (!result.ok) return null;
  await admin
    .from('offers')
    .update({ autenticitate_pachet: result.data.autenticitate_pachet, filtru_anti_fals_detalii: result.data })
    .eq('id', offerId);
  return result.data;
}

/** Ghidul RAR (Auto de Epocă & Traducere) — best-effort; primește verdictul deja calculat
 * de Filtru Anti-Fals (dacă există) ca fapt determinist, nu îl recalculează. Independent de
 * rezultatul Filtru Anti-Fals (nu folosim runPipeline aici — semantica lui de „oprire la primul
 * eșec" ar contrazice principiul de best-effort folosit peste tot altundeva în acest fișier). */
async function verificaGhidRar(admin: SupabaseClient, offerId: string, input: GhidRarInput): Promise<void> {
  const result = await runAgent<GhidRarInput, GhidRarOutput>('ghid-rar', input, {
    triggerSource: 'import_oferte',
    relatedOfferId: offerId,
  });
  if (!result.ok) return;
  await admin
    .from('offers')
    .update({ eligibilitate_rar: result.data.eligibilitate_rar, rezumat_ro: result.data.rezumat_ro })
    .eq('id', offerId);
}

export async function applyImportPlan(
  admin: SupabaseClient,
  plan: ImportPlan,
  submittedBy: string
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const u of plan.toUpdate) {
    const updates: Record<string, unknown> = { last_seen: new Date().toISOString() };
    if (u.priceChanged) {
      updates.price = u.price;
      await admin.from('offer_price_history').insert({ offer_id: u.id, price: u.price });
    }
    await admin.from('offers').update(updates).eq('id', u.id);
    updated++;
  }

  for (const offer of plan.toInsert) {
    const { data: insertedRow, error: insErr } = await admin
      .from('offers')
      .insert({
        model_code: offer.model_code,
        title: offer.title,
        price: offer.price,
        url: offer.url,
        year: offer.year,
        km: offer.km,
        cond: offer.cond,
        options: offer.options,
        history_verified: offer.history_verified,
        negotiability: offer.negotiability,
        country: offer.country,
        note: offer.note,
        submitted_by: submittedBy,
        moderation: 'approved',
        status: 'active',
        fingerprint: fingerprintOf(offer.model_code, offer.year),
      })
      .select('id')
      .single();
    if (!insErr) {
      inserted++;
      await verificaAutenticitate(admin, insertedRow.id, offer.note ?? null);
      const verdictFiltru = await verificaFiltruAntiFals(admin, insertedRow.id, {
        modelCode: offer.model_code,
        titlu: offer.title,
        text: offer.note ?? null,
        pret: offer.price,
        an: offer.year ?? null,
      });
      await verificaGhidRar(admin, insertedRow.id, {
        titlu: offer.title,
        text: offer.note ?? null,
        anFabricatie: offer.year ?? null,
        verdictFiltruAntiFals: verdictFiltru,
      });
    }
  }

  await admin.rpc('recalculate_offer_scores');

  return { inserted, updated };
}
