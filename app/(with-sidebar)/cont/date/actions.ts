'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getTargetModels } from '@/lib/models';
import { normalizeBackupListings, type BackupFile } from '@/lib/backup';
import { logAudit } from '@/lib/audit';

/** F-07 — export complet al Listei mele (GDPR-02: portabilitate datelor). */
export async function exportBackup(): Promise<{ data: BackupFile } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const { data: items, error } = await supabase
    .from('watchlist_items')
    .select('model_code,title,price,url,year,km,note,cond,status,criteria,price_history,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return { error: error.message };

  return {
    data: {
      app: 'VanatorulMB',
      exported: new Date().toISOString(),
      listings: (items ?? []) as BackupFile['listings'],
    },
  };
}

export type ImportResult = { error: string } | { ok: true; imported: number; skipped: number; errors: string[] };

/**
 * F-07 — import backup. Acceptă formatul propriu SAU un export vechi din v5
 * (cerință de acceptare M1). Adaugă la lista existentă, fără duplicate după
 * link — spre deosebire de v5 (unde importul înlocuia tot), aici păstrăm
 * datele deja sincronizate în cont, ca să nu le pierdem accidental.
 */
export async function importBackup(jsonText: string): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { error: 'Fișierul nu conține JSON valid.' };
  }

  const { models } = await getTargetModels();
  const result = normalizeBackupListings(
    parsed,
    models.map((m) => m.code)
  );
  if ('error' in result) return { error: result.error };

  const { data: existing } = await supabase.from('watchlist_items').select('url').eq('user_id', user.id);
  const existingUrls = new Set((existing ?? []).map((r) => r.url).filter(Boolean));

  const toInsert = result.rows.filter((r) => !(r.url && existingUrls.has(r.url)));
  const skipped = result.rows.length - toInsert.length;

  if (toInsert.length) {
    const { error: insErr } = await supabase
      .from('watchlist_items')
      .insert(toInsert.map((r) => ({ ...r, user_id: user.id })));
    if (insErr) return { error: insErr.message };
  }

  revalidatePath('/cont/lista');
  return { ok: true, imported: toInsert.length, skipped, errors: result.errors };
}

const DELETION_GRACE_DAYS = 30;

/**
 * GDPR-02 — cerere de ștergere cont, cu 30 de zile de grație (anulabilă din
 * /cont/date, cât timp contul e activ). Cere reconfirmarea parolei — e o
 * acțiune ireversibilă după expirarea grației, nu trebuie declanșată doar
 * de o sesiune deja deschisă furată/lăsată nesupravegheată.
 */
export async function requestAccountDeletion(password: string): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'Neautentificat.' };

  const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (authErr) return { error: 'Parolă incorectă.' };

  const { error } = await supabase
    .from('profiles')
    .update({ deletion_requested_at: new Date().toISOString() })
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  await logAudit('account_delete_requested', { userId: user.id, email: user.email });
  revalidatePath('/cont/date');
  return { ok: true };
}

/** Anulează o cerere de ștergere aflată încă în perioada de grație. */
export async function cancelAccountDeletion(): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const { error } = await supabase.from('profiles').update({ deletion_requested_at: null }).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/cont/date');
  return { ok: true };
}

export type DeletionStatus = { requestedAt: string | null; deleteOnIso: string | null };

export async function getDeletionStatus(): Promise<DeletionStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { requestedAt: null, deleteOnIso: null };

  const { data } = await supabase.from('profiles').select('deletion_requested_at').eq('user_id', user.id).single();
  const requestedAt = data?.deletion_requested_at ?? null;
  if (!requestedAt) return { requestedAt: null, deleteOnIso: null };

  const deleteOn = new Date(requestedAt);
  deleteOn.setDate(deleteOn.getDate() + DELETION_GRACE_DAYS);
  return { requestedAt, deleteOnIso: deleteOn.toISOString() };
}
