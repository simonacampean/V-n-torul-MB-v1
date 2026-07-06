// Scriere efectivă în DB pentru un plan de import (I-02) — extras din
// server actions ca să fie reutilizabil atât pentru importul manual
// (app/cont/oferte/actions.ts), cât și pentru aprobarea draft-urilor
// generate de rutina Claude programată (app/admin/oferte/actions.ts), cât
// și pentru auto-aprobarea directă din /api/agent-report.
import type { SupabaseClient } from '@supabase/supabase-js';
import { fingerprintOf, type ImportPlan } from '@/lib/offers';
import { runAgent } from '@/lib/agents/orchestrator';
import type { RaportAutenticitate } from '@/lib/agents/detectiv-autenticitate';
import type { FiltruAntiFalsInput, FiltruAntiFalsOutput } from '@/lib/agents/filtru-anti-fals';
import type { GhidRarInput, GhidRarOutput } from '@/lib/agents/ghid-rar';
import type { ArheologulOptiuniInput, ArheologulOptiuniOutput } from '@/lib/agents/arheologul-optiuni';
import type { CalculatorRestaurareInput, CalculatorRestaurareOutput } from '@/lib/agents/calculator-restaurare';

/** Rezultatul unei verificări de siguranță (Detectiv/Filtru) — tri-state,
 * ca să distingem „nimic de analizat" (sigur) de „agentul a eșuat" (fără
 * semnal, deci NU sigur pentru auto-aprobare — vezi evalueazaGateAutoAprobare). */
type RezultatVerificare<T> = { status: 'fara_text' } | { status: 'succes'; data: T } | { status: 'eroare' };

/** Verificare automată de autenticitate (Detectivul de Autenticitate) — rulează
 * DOAR dacă anunțul are un `note` de analizat, și e strict best-effort: un eșec
 * (ex. ANTHROPIC_API_KEY neconfigurat) nu blochează niciodată importul, doar
 * lasă scorul necompletat pe acel anunț. */
async function verificaAutenticitate(
  admin: SupabaseClient,
  offerId: string,
  note: string | null
): Promise<RezultatVerificare<RaportAutenticitate>> {
  if (!note?.trim()) return { status: 'fara_text' };
  const result = await runAgent<{ descriere: string }, RaportAutenticitate>(
    'detectiv-autenticitate',
    { descriere: note },
    { triggerSource: 'import_oferte', relatedOfferId: offerId }
  );
  if (!result.ok) return { status: 'eroare' };
  await admin
    .from('offers')
    .update({ risc_autenticitate_scor: result.data.scor_risc, risc_autenticitate_detalii: result.data })
    .eq('id', offerId);
  return { status: 'succes', data: result.data };
}

/** Filtru Anti-Fals (Replica Detector) — la fel de best-effort ca verificaAutenticitate;
 * rulează pe fiecare anunț importat (agentul însuși scurtcircuitează, fără apel Claude,
 * dacă nu găsește nicio insignă flagship sau sintagmă suspectă). */
async function verificaFiltruAntiFals(
  admin: SupabaseClient,
  offerId: string,
  input: FiltruAntiFalsInput
): Promise<RezultatVerificare<FiltruAntiFalsOutput>> {
  const result = await runAgent<FiltruAntiFalsInput, FiltruAntiFalsOutput>('filtru-anti-fals', input, {
    triggerSource: 'import_oferte',
    relatedOfferId: offerId,
  });
  if (!result.ok) return { status: 'eroare' };
  await admin
    .from('offers')
    .update({ autenticitate_pachet: result.data.autenticitate_pachet, filtru_anti_fals_detalii: result.data })
    .eq('id', offerId);
  return { status: 'succes', data: result.data };
}

/** Pragul peste care Detectivul de Autenticitate blochează auto-aprobarea. */
const PRAG_RISC_AUTO_APROBARE = 5;
/** Verdicte Filtru Anti-Fals care blochează auto-aprobarea. */
const VERDICTE_BLOCANTE = ['Replica', 'Suspicios'];

/**
 * Gate determinist pentru auto-aprobarea anunțurilor venite din rutina
 * programată, fără un admin uman în buclă. Fail-safe conservator: dacă un
 * agent a fost apelat (exista text) dar a EȘUAT, nu există niciun semnal de
 * siguranță — anunțul NU se auto-aprobă, rămâne „pending" pentru un om.
 */
export function evalueazaGateAutoAprobare(
  detectiv: RezultatVerificare<RaportAutenticitate>,
  filtru: RezultatVerificare<FiltruAntiFalsOutput>
): boolean {
  if (detectiv.status === 'eroare' || filtru.status === 'eroare') return false;
  if (detectiv.status === 'succes' && detectiv.data.scor_risc > PRAG_RISC_AUTO_APROBARE) return false;
  if (filtru.status === 'succes' && VERDICTE_BLOCANTE.includes(filtru.data.autenticitate_pachet)) return false;
  return true;
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

/** Arheologul de Opțiuni — rulează DOAR dacă anunțul are un `note` de analizat (la fel ca
 * verificaAutenticitate); e 100% determinist (fără apel Claude), deci practic gratuit, dar
 * fără text n-are ce căuta. Bonusul e stocat, NU conectat la scorul real — vezi migrarea 0017. */
async function verificaArheologulOptiuni(admin: SupabaseClient, offerId: string, note: string | null): Promise<void> {
  if (!note?.trim()) return;
  const result = await runAgent<ArheologulOptiuniInput, ArheologulOptiuniOutput>(
    'arheologul-optiuni',
    { text: note },
    { triggerSource: 'import_oferte', relatedOfferId: offerId }
  );
  if (!result.ok) return;
  await admin
    .from('offers')
    .update({
      dotari_rare_detectate: result.data.dotari_rare_detectate,
      nota_raritate: result.data.nota_raritate,
      bonus_dotari_rare: result.data.bonus_dotari_rare,
    })
    .eq('id', offerId);
}

/** Calculator de Restaurare — rulează DOAR dacă anunțul are un `note` de analizat (la fel ca
 * verificaAutenticitate); e best-effort ca toți ceilalți. */
async function verificaCalculatorRestaurare(
  admin: SupabaseClient,
  offerId: string,
  input: CalculatorRestaurareInput
): Promise<void> {
  if (!input.text?.trim()) return;
  const result = await runAgent<CalculatorRestaurareInput, CalculatorRestaurareOutput>(
    'calculator-restaurare',
    input,
    { triggerSource: 'import_oferte', relatedOfferId: offerId }
  );
  if (!result.ok) return;
  await admin
    .from('offers')
    .update({
      buget_reimprospatare_estimat: result.data.buget_reimprospatare_estimat,
      detaliere_necesitati: result.data.detaliere_necesitati,
      mesaj_atentionare: result.data.mesaj_atentionare,
    })
    .eq('id', offerId);
}

export interface ApplyImportPlanOptions {
  /** Când e true: anunțurile noi se inserează „pending" și trec prin gate-ul
   * de siguranță (evalueazaGateAutoAprobare) înainte să devină „approved" —
   * folosit de auto-aprobarea din /api/agent-report, FĂRĂ un admin în buclă.
   * Implicit false: comportamentul existent, aprobat direct (un admin a
   * decis deja explicit — vezi importDraft din admin/oferte/actions.ts). */
  autoModerate?: boolean;
}

export async function applyImportPlan(
  admin: SupabaseClient,
  plan: ImportPlan,
  submittedBy: string | null,
  opts: ApplyImportPlanOptions = {}
): Promise<{ inserted: number; updated: number; autoApproved: number; needsReview: number }> {
  let inserted = 0;
  let updated = 0;
  let autoApproved = 0;
  let needsReview = 0;

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
        moderation: opts.autoModerate ? 'pending' : 'approved',
        status: 'active',
        fingerprint: fingerprintOf(offer.model_code, offer.year),
      })
      .select('id')
      .single();
    if (!insErr) {
      inserted++;
      const rezDetectiv = await verificaAutenticitate(admin, insertedRow.id, offer.note ?? null);
      const rezFiltru = await verificaFiltruAntiFals(admin, insertedRow.id, {
        modelCode: offer.model_code,
        titlu: offer.title,
        text: offer.note ?? null,
        pret: offer.price,
        an: offer.year ?? null,
      });
      const verdictFiltru = rezFiltru.status === 'succes' ? rezFiltru.data : null;
      await verificaGhidRar(admin, insertedRow.id, {
        titlu: offer.title,
        text: offer.note ?? null,
        anFabricatie: offer.year ?? null,
        verdictFiltruAntiFals: verdictFiltru,
      });
      await verificaArheologulOptiuni(admin, insertedRow.id, offer.note ?? null);
      await verificaCalculatorRestaurare(admin, insertedRow.id, {
        modelCode: offer.model_code,
        text: offer.note ?? null,
      });

      if (opts.autoModerate) {
        if (evalueazaGateAutoAprobare(rezDetectiv, rezFiltru)) {
          await admin.from('offers').update({ moderation: 'approved' }).eq('id', insertedRow.id);
          autoApproved++;
        } else {
          needsReview++;
        }
      }
    }
  }

  await admin.rpc('recalculate_offer_scores');

  return { inserted, updated, autoApproved, needsReview };
}
