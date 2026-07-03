// Scriere efectivă în DB pentru un plan de import (I-02) — extras din
// server actions ca să fie reutilizabil atât pentru importul manual
// (app/cont/oferte/actions.ts), cât și pentru aprobarea draft-urilor
// generate de rutina Claude programată (app/admin/oferte/actions.ts).
import type { SupabaseClient } from '@supabase/supabase-js';
import { fingerprintOf, type ImportPlan } from '@/lib/offers';

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
    const { error: insErr } = await admin.from('offers').insert({
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
    });
    if (!insErr) inserted++;
  }

  await admin.rpc('recalculate_offer_scores');

  return { inserted, updated };
}
