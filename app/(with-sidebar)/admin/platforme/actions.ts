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

// .nullish() (nu .optional()): formData.get() întoarce `null`, nu `undefined`,
// pentru un checkbox nebifat — .optional() singur ar respinge acel null.
const platformSchema = z.object({
  name: z.string().trim().min(1, 'Numele e obligatoriu.'),
  country: z.string().trim().min(2, 'Țara e obligatorie.'),
  grp: z.enum(['major', 'med', 'collect']),
  negotiability: z.enum(['DA', 'PARTIAL', 'NU', 'REF']),
  note: z.string().nullish(),
  url_template: z.string().nullish(),
  connector_type: z.enum(['api', 'affiliate', 'manual', 'native']),
  legal_basis: z.string().nullish(),
  active: z.string().nullish(),
});

function parsePlatformForm(formData: FormData) {
  return platformSchema.safeParse({
    name: formData.get('name'),
    country: formData.get('country'),
    grp: formData.get('grp'),
    negotiability: formData.get('negotiability'),
    note: formData.get('note'),
    url_template: formData.get('url_template'),
    connector_type: formData.get('connector_type'),
    legal_basis: formData.get('legal_basis'),
    active: formData.get('active'),
  });
}

/** AD-01 — creare platformă. RLS `platforms_admin_write` permite scriere doar adminilor. */
export async function createPlatform(formData: FormData): Promise<void> {
  const check = await requireAdmin();
  if ('error' in check) redirect(`/admin/platforme?err=${encodeURIComponent(check.error)}`);

  const parsed = parsePlatformForm(formData);
  if (!parsed.success) redirect(`/admin/platforme?err=${encodeURIComponent(parsed.error.issues[0].message)}`);

  // I-01/L-02 — conectoarele cu bază legală (api/affiliate) trebuie să documenteze
  // baza legală în cod, nu doar în text liber; blocăm salvarea dacă lipsește.
  if ((parsed.data.connector_type === 'api' || parsed.data.connector_type === 'affiliate') && !parsed.data.legal_basis?.trim()) {
    redirect(`/admin/platforme?err=${encodeURIComponent('Conectorul api/affiliate necesită bază legală documentată.')}`);
  }

  const { error } = await check.supabase.from('platforms').insert({
    name: parsed.data.name,
    country: parsed.data.country.toUpperCase(),
    grp: parsed.data.grp,
    negotiability: parsed.data.negotiability,
    note: parsed.data.note || null,
    url_template: parsed.data.url_template || null,
    connector_type: parsed.data.connector_type,
    legal_basis: parsed.data.legal_basis || null,
    active: parsed.data.active === 'on',
  });
  if (error) redirect(`/admin/platforme?err=${encodeURIComponent(error.message)}`);

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'create_platform', name: parsed.data.name } });
  revalidatePath('/admin/platforme');
  redirect('/admin/platforme');
}

export async function updatePlatform(id: string, formData: FormData): Promise<void> {
  const check = await requireAdmin();
  if ('error' in check) redirect(`/admin/platforme/${id}?err=${encodeURIComponent(check.error)}`);

  const parsed = parsePlatformForm(formData);
  if (!parsed.success) redirect(`/admin/platforme/${id}?err=${encodeURIComponent(parsed.error.issues[0].message)}`);

  if ((parsed.data.connector_type === 'api' || parsed.data.connector_type === 'affiliate') && !parsed.data.legal_basis?.trim()) {
    redirect(`/admin/platforme/${id}?err=${encodeURIComponent('Conectorul api/affiliate necesită bază legală documentată.')}`);
  }

  const { error } = await check.supabase
    .from('platforms')
    .update({
      name: parsed.data.name,
      country: parsed.data.country.toUpperCase(),
      grp: parsed.data.grp,
      negotiability: parsed.data.negotiability,
      note: parsed.data.note || null,
      url_template: parsed.data.url_template || null,
      connector_type: parsed.data.connector_type,
      legal_basis: parsed.data.legal_basis || null,
      active: parsed.data.active === 'on',
    })
    .eq('id', id);
  if (error) redirect(`/admin/platforme/${id}?err=${encodeURIComponent(error.message)}`);

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'update_platform', id } });
  revalidatePath('/admin/platforme');
  revalidatePath(`/admin/platforme/${id}`);
  redirect(`/admin/platforme/${id}?ok=1`);
}

export async function deletePlatform(id: string): Promise<{ error: string } | { ok: true }> {
  const check = await requireAdmin();
  if ('error' in check) return { error: check.error };

  const { error } = await check.supabase.from('platforms').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'delete_platform', id } });
  revalidatePath('/admin/platforme');
  return { ok: true };
}
