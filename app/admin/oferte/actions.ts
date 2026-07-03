'use server';

import { revalidatePath } from 'next/cache';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTargetModels } from '@/lib/models';
import { validateOffers, planOfferImport } from '@/lib/offers';
import { applyImportPlan } from '@/lib/server/offers-import';

type AdminCheckResult = { error: string } | { user: User };

async function requireAdminUser(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Doar administratorii pot face asta.' };

  return { user };
}

/** AD-02 — moderarea anunțurilor native (I-03). RLS permite update doar adminilor pe alte rânduri. */
export async function moderateOffer(
  offerId: string,
  decision: 'approved' | 'rejected'
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Doar administratorii pot modera anunțuri.' };

  const { error } = await supabase.from('offers').update({ moderation: decision }).eq('id', offerId);
  if (error) return { error: error.message };

  revalidatePath('/admin/oferte');
  revalidatePath('/oferte');
  return { ok: true };
}

export type ImportDraftResult = { error: string } | { ok: true; inserted: number; updated: number; skipped: number };

/**
 * Aprobă un draft trimis de rutina Claude programată (POST /api/agent-report)
 * — omul rămâne în buclă la decizia finală, chiar dacă generarea raportului
 * e automatizată. Reutilizează exact logica de import manual (I-02/I-05).
 */
export async function importDraft(draftId: string): Promise<ImportDraftResult> {
  const check = await requireAdminUser();
  if ('error' in check) return { error: check.error };

  const admin = createAdminClient();

  const { data: draft, error: draftErr } = await admin
    .from('agent_report_drafts')
    .select('id, payload, status')
    .eq('id', draftId)
    .single();
  if (draftErr || !draft) return { error: 'Draft negăsit.' };
  if (draft.status !== 'pending') return { error: 'Acest draft a fost deja procesat.' };

  const report = draft.payload as { offers: unknown[] };
  const { models } = await getTargetModels();
  const { valid, skipped: invalidSkipped } = validateOffers(
    report.offers,
    models.map((m) => m.code)
  );
  if (!valid.length) return { error: 'Niciun anunț valid în acest draft.' };

  const { data: existingOffers } = await admin
    .from('offers')
    .select('id, model_code, year, price, km, url')
    .eq('status', 'active');

  const plan = planOfferImport(valid, existingOffers ?? []);
  const { inserted, updated } = await applyImportPlan(admin, plan, check.user.id);

  await admin.from('agent_report_drafts').update({ status: 'imported' }).eq('id', draftId);

  revalidatePath('/admin/oferte');
  revalidatePath('/oferte');
  return { ok: true, inserted, updated, skipped: invalidSkipped };
}

export async function rejectDraft(draftId: string): Promise<{ error: string } | { ok: true }> {
  const check = await requireAdminUser();
  if ('error' in check) return { error: check.error };

  const admin = createAdminClient();
  const { error } = await admin.from('agent_report_drafts').update({ status: 'rejected' }).eq('id', draftId);
  if (error) return { error: error.message };

  revalidatePath('/admin/oferte');
  return { ok: true };
}
