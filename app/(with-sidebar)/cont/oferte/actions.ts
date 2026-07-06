'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTargetModels } from '@/lib/models';
import { parsePrice } from '@/lib/scoring';
import { extractAgentReport, validateOffers, planOfferImport } from '@/lib/offers';
import { applyImportPlan } from '@/lib/server/offers-import';
import { trackEvent } from '@/lib/track';
import { runAgent } from '@/lib/agents/orchestrator';
import type { RaportAutenticitate } from '@/lib/agents/detectiv-autenticitate';
import type { FiltruAntiFalsInput, FiltruAntiFalsOutput } from '@/lib/agents/filtru-anti-fals';
import type { GhidRarInput, GhidRarOutput } from '@/lib/agents/ghid-rar';
import type { ArheologulOptiuniInput, ArheologulOptiuniOutput } from '@/lib/agents/arheologul-optiuni';

export type ImportOffersResult = { error: string } | { ok: true; inserted: number; updated: number; skipped: number };

/**
 * I-02 — import raportul agentului. Scriere prin clientul admin (service
 * role): RLS pe `offers` nu permite inserții cu moderation='approved' din
 * sesiunea userului obișnuit (doar 'pending', pt. I-03) — importul e un flux
 * semi-încrezut, gatekeeping-ul e chiar acest server action, nu RLS.
 * I-05 — deduplicare pe URL exact, apoi fingerprint (model+an) + km/preț ±5%.
 */
export async function importOffersReport(text: string): Promise<ImportOffersResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const report = extractAgentReport(text);
  if ('error' in report) return { error: report.error };

  const { models } = await getTargetModels();
  const { valid, skipped: invalidSkipped } = validateOffers(
    report.offers,
    models.map((m) => m.code)
  );
  if (!valid.length) return { error: 'Niciun anunț valid în raport.' };

  const admin = createAdminClient();

  const { data: existingOffers } = await admin
    .from('offers')
    .select('id, model_code, year, price, km, url')
    .eq('status', 'active');

  const plan = planOfferImport(valid, existingOffers ?? []);
  const { inserted, updated } = await applyImportPlan(admin, plan, user.id);

  revalidatePath('/oferte');
  return { ok: true, inserted, updated, skipped: invalidSkipped };
}

const nativeOfferSchema = z.object({
  model_code: z.string().min(1),
  title: z.string().trim().min(1, 'Titlul e obligatoriu.'),
  price: z.string().min(1, 'Prețul e obligatoriu.'),
  url: z.string().optional(),
  year: z.string().optional(),
  km: z.string().optional(),
  cond: z.enum(['1', '2', '3', '4']),
  options: z.enum(['full', 'partial', 'standard']),
  country: z.string().trim().min(2, 'Țara e obligatorie.'),
  note: z.string().optional(),
});

/**
 * I-03 — userul publică propriul anunț. Prin sesiunea proprie (nu admin) —
 * RLS (offers_user_insert) impune submitted_by = auth.uid() și
 * moderation = 'pending', deci nu se poate auto-aproba.
 */
export async function submitNativeOffer(formData: FormData): Promise<{ error: string } | { ok: true }> {
  const parsed = nativeOfferSchema.safeParse({
    model_code: formData.get('model_code'),
    title: formData.get('title'),
    price: formData.get('price'),
    url: formData.get('url'),
    year: formData.get('year'),
    km: formData.get('km'),
    cond: formData.get('cond'),
    options: formData.get('options'),
    country: formData.get('country'),
    note: formData.get('note'),
  });
  if (!parsed.success) {
    await trackEvent('form_error', { action: 'submit_native_offer', message: parsed.error.issues[0].message });
    return { error: parsed.error.issues[0].message };
  }

  const price = parsePrice(parsed.data.price);
  if (price == null) {
    await trackEvent('form_error', { action: 'submit_native_offer', message: 'Preț invalid.' });
    return { error: 'Preț invalid.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const note = parsed.data.note || null;
  const { data: insertedRow, error } = await supabase
    .from('offers')
    .insert({
      model_code: parsed.data.model_code,
      title: parsed.data.title,
      price,
      url: parsed.data.url || null,
      year: parsePrice(parsed.data.year),
      km: parsePrice(parsed.data.km),
      cond: parsed.data.cond,
      options: parsed.data.options,
      country: parsed.data.country.toUpperCase(),
      note,
      submitted_by: user.id,
      moderation: 'pending',
    })
    .select('id')
    .single();
  if (error) {
    await trackEvent('form_error', { action: 'submit_native_offer', message: error.message });
    return { error: error.message };
  }

  // Verificare automată de autenticitate (Detectivul de Autenticitate) — best-effort,
  // nu blochează publicarea anunțului dacă agentul eșuează (ex. cheie API neconfigurată).
  if (note?.trim()) {
    const result = await runAgent<{ descriere: string }, RaportAutenticitate>(
      'detectiv-autenticitate',
      { descriere: note },
      { triggerSource: 'anunt_nativ', relatedOfferId: insertedRow.id }
    );
    if (result.ok) {
      const admin = createAdminClient();
      await admin
        .from('offers')
        .update({ risc_autenticitate_scor: result.data.scor_risc, risc_autenticitate_detalii: result.data })
        .eq('id', insertedRow.id);
    }
  }

  // Filtru Anti-Fals (Replica Detector) — la fel de best-effort; agentul însuși
  // scurtcircuitează fără apel Claude dacă nu găsește nicio insignă flagship/sintagmă suspectă.
  const anFabricatie = parsePrice(parsed.data.year);
  let verdictFiltru: FiltruAntiFalsOutput | null = null;
  {
    const filtruInput: FiltruAntiFalsInput = {
      modelCode: parsed.data.model_code,
      titlu: parsed.data.title,
      text: note,
      pret: price,
      an: anFabricatie,
    };
    const result = await runAgent<FiltruAntiFalsInput, FiltruAntiFalsOutput>('filtru-anti-fals', filtruInput, {
      triggerSource: 'anunt_nativ',
      relatedOfferId: insertedRow.id,
    });
    if (result.ok) {
      verdictFiltru = result.data;
      const admin = createAdminClient();
      await admin
        .from('offers')
        .update({ autenticitate_pachet: result.data.autenticitate_pachet, filtru_anti_fals_detalii: result.data })
        .eq('id', insertedRow.id);
    }
  }

  // Ghidul RAR (Auto de Epocă & Traducere) — best-effort; reutilizează verdictul Filtru
  // Anti-Fals de mai sus (dacă a reușit) ca fapt determinist, nu recalculează originalitatea.
  {
    const ghidInput: GhidRarInput = {
      titlu: parsed.data.title,
      text: note,
      anFabricatie,
      verdictFiltruAntiFals: verdictFiltru,
    };
    const result = await runAgent<GhidRarInput, GhidRarOutput>('ghid-rar', ghidInput, {
      triggerSource: 'anunt_nativ',
      relatedOfferId: insertedRow.id,
    });
    if (result.ok) {
      const admin = createAdminClient();
      await admin
        .from('offers')
        .update({ eligibilitate_rar: result.data.eligibilitate_rar, rezumat_ro: result.data.rezumat_ro })
        .eq('id', insertedRow.id);
    }
  }

  // Arheologul de Opțiuni — best-effort, 100% determinist (fără apel Claude); rulează
  // doar dacă există note de analizat.
  if (note?.trim()) {
    const result = await runAgent<ArheologulOptiuniInput, ArheologulOptiuniOutput>(
      'arheologul-optiuni',
      { text: note },
      { triggerSource: 'anunt_nativ', relatedOfferId: insertedRow.id }
    );
    if (result.ok) {
      const admin = createAdminClient();
      await admin
        .from('offers')
        .update({
          dotari_rare_detectate: result.data.dotari_rare_detectate,
          nota_raritate: result.data.nota_raritate,
          bonus_dotari_rare: result.data.bonus_dotari_rare,
        })
        .eq('id', insertedRow.id);
    }
  }

  await trackEvent('native_offer_submitted', { model_code: parsed.data.model_code });
  revalidatePath('/cont/oferte/publica');
  return { ok: true };
}
