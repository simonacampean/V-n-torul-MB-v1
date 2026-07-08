'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

type AdminCheck = { error: string } | { supabase: Awaited<ReturnType<typeof createClient>>; user: User };

async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Doar administratorii pot face asta.' };

  return { supabase, user };
}

// `sursa` e obligatorie aici la nivel de aplicație (nu doar coloană nullable
// în DB) — punctul central al acestui panou e să oprească exact ce am refuzat
// la cererea inițială: prețuri „aproximative" fără proveniență verificabilă.
const trendFieldsSchema = z.object({
  model_code: z.string().trim().min(1, 'Modelul e obligatoriu.'),
  an_calendaristic: z.coerce.number().int().min(2000).max(2100),
  pret_mediu_estimat: z.coerce.number().int().positive('Prețul trebuie să fie pozitiv.'),
  sursa: z.string().trim().min(3, 'Sursa e obligatorie (ex.: „K500 Youngtimer Index", „Hagerty Price Guide condiție #3").'),
});

function readTrendFields(formData: FormData) {
  return {
    model_code: formData.get('model_code'),
    an_calendaristic: formData.get('an_calendaristic'),
    pret_mediu_estimat: formData.get('pret_mediu_estimat'),
    sursa: formData.get('sursa'),
  };
}

/** Populare `model_macro_trends` — panou admin, singura cale de scriere (fără seed automat, vezi migrarea 0023). */
export async function createTrend(formData: FormData): Promise<void> {
  const check = await requireAdmin();
  if ('error' in check) redirect(`/admin/tendinte?err=${encodeURIComponent(check.error)}`);

  const parsed = trendFieldsSchema.safeParse(readTrendFields(formData));
  if (!parsed.success) redirect(`/admin/tendinte?err=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const { error } = await check.supabase.from('model_macro_trends').insert({
    model_code: parsed.data.model_code,
    an_calendaristic: parsed.data.an_calendaristic,
    pret_mediu_estimat: parsed.data.pret_mediu_estimat,
    sursa: parsed.data.sursa,
  });
  if (error) {
    const msg = error.code === '23505' ? 'Există deja o valoare pentru acest model și an — editeaz-o pe cea existentă.' : error.message;
    redirect(`/admin/tendinte?err=${encodeURIComponent(msg)}`);
  }

  await logAudit('admin_action', {
    userId: check.user.id,
    email: check.user.email,
    detail: { action: 'create_trend', model_code: parsed.data.model_code, an: parsed.data.an_calendaristic },
  });
  revalidatePath('/admin/tendinte');
  revalidatePath('/');
  revalidatePath('/oferte');
  redirect('/admin/tendinte');
}

export async function updateTrend(id: string, formData: FormData): Promise<void> {
  const check = await requireAdmin();
  if ('error' in check) redirect(`/admin/tendinte/${id}?err=${encodeURIComponent(check.error)}`);

  const parsed = trendFieldsSchema.safeParse(readTrendFields(formData));
  if (!parsed.success) redirect(`/admin/tendinte/${id}?err=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const { error } = await check.supabase
    .from('model_macro_trends')
    .update({
      model_code: parsed.data.model_code,
      an_calendaristic: parsed.data.an_calendaristic,
      pret_mediu_estimat: parsed.data.pret_mediu_estimat,
      sursa: parsed.data.sursa,
    })
    .eq('id', id);
  if (error) {
    const msg = error.code === '23505' ? 'Există deja o valoare pentru acest model și an.' : error.message;
    redirect(`/admin/tendinte/${id}?err=${encodeURIComponent(msg)}`);
  }

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'update_trend', id } });
  revalidatePath('/admin/tendinte');
  revalidatePath(`/admin/tendinte/${id}`);
  revalidatePath('/');
  revalidatePath('/oferte');
  redirect(`/admin/tendinte/${id}?ok=1`);
}

export async function deleteTrend(id: string): Promise<{ error: string } | { ok: true }> {
  const check = await requireAdmin();
  if ('error' in check) return { error: check.error };

  const { error } = await check.supabase.from('model_macro_trends').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'delete_trend', id } });
  revalidatePath('/admin/tendinte');
  revalidatePath('/');
  revalidatePath('/oferte');
  return { ok: true };
}
