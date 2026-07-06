'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

/** Moderare „Vânători Reușite" — mirror exact al moderateOffer (AD-02). RLS
 * (success_stories_admin_update) permite update doar adminilor. */
export async function moderateStory(
  storyId: string,
  decision: 'approved' | 'rejected'
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Doar administratorii pot modera povești.' };

  const { error } = await supabase.from('success_stories').update({ moderation: decision }).eq('id', storyId);
  if (error) return { error: error.message };

  await logAudit('admin_action', { userId: user.id, email: user.email, detail: { action: 'moderate_story', storyId, decision } });
  revalidatePath('/admin/povesti');
  revalidatePath('/');
  return { ok: true };
}
