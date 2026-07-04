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

const campaignSchema = z.object({
  position: z.enum(['banner', 'infeed', 'footer']),
  mode: z.enum(['adsense', 'direct']),
  sponsor_name: z.string().trim().optional(),
  image_url: z.string().trim().optional(),
  target_url: z.string().trim().optional(),
  starts_at: z.string().trim().optional(),
  ends_at: z.string().trim().optional(),
});

/** AD-03 — creare campanie directă. RLS `ads_admin_write` permite scriere doar adminilor. */
export async function createCampaign(formData: FormData): Promise<void> {
  const check = await requireAdmin();
  if ('error' in check) redirect(`/admin/publicitate?err=${encodeURIComponent(check.error)}`);

  const parsed = campaignSchema.safeParse({
    position: formData.get('position'),
    mode: formData.get('mode'),
    sponsor_name: formData.get('sponsor_name'),
    image_url: formData.get('image_url'),
    target_url: formData.get('target_url'),
    starts_at: formData.get('starts_at'),
    ends_at: formData.get('ends_at'),
  });
  if (!parsed.success) redirect(`/admin/publicitate?err=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const { error } = await check.supabase.from('ad_campaigns').insert({
    position: parsed.data.position,
    mode: parsed.data.mode,
    sponsor_name: parsed.data.sponsor_name || null,
    image_url: parsed.data.image_url || null,
    target_url: parsed.data.target_url || null,
    starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at).toISOString() : null,
    ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at).toISOString() : null,
  });
  if (error) redirect(`/admin/publicitate?err=${encodeURIComponent(error.message)}`);

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'create_campaign', position: parsed.data.position } });
  revalidatePath('/admin/publicitate');
  redirect('/admin/publicitate');
}

export async function toggleCampaign(campaignId: string, active: boolean): Promise<{ error: string } | { ok: true }> {
  const check = await requireAdmin();
  if ('error' in check) return { error: check.error };

  const { error } = await check.supabase.from('ad_campaigns').update({ active }).eq('id', campaignId);
  if (error) return { error: error.message };

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'toggle_campaign', campaignId, active } });
  revalidatePath('/admin/publicitate');
  return { ok: true };
}

export async function deleteCampaign(campaignId: string): Promise<{ error: string } | { ok: true }> {
  const check = await requireAdmin();
  if ('error' in check) return { error: check.error };

  const { error } = await check.supabase.from('ad_campaigns').delete().eq('id', campaignId);
  if (error) return { error: error.message };

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'delete_campaign', campaignId } });
  revalidatePath('/admin/publicitate');
  return { ok: true };
}
