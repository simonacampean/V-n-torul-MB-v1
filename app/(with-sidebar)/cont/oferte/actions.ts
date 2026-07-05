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

  const { error } = await supabase.from('offers').insert({
    model_code: parsed.data.model_code,
    title: parsed.data.title,
    price,
    url: parsed.data.url || null,
    year: parsePrice(parsed.data.year),
    km: parsePrice(parsed.data.km),
    cond: parsed.data.cond,
    options: parsed.data.options,
    country: parsed.data.country.toUpperCase(),
    note: parsed.data.note || null,
    submitted_by: user.id,
    moderation: 'pending',
  });
  if (error) {
    await trackEvent('form_error', { action: 'submit_native_offer', message: error.message });
    return { error: error.message };
  }

  await trackEvent('native_offer_submitted', { model_code: parsed.data.model_code });
  revalidatePath('/cont/oferte/publica');
  return { ok: true };
}
