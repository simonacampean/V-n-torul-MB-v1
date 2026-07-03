'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const prefsSchema = z.object({
  followed_models: z.array(z.string()),
  alert_threshold: z.coerce.number().int().min(50).max(100),
  max_budget: z.coerce.number().int().min(0),
  preferred_countries: z.array(z.string()),
  email_alerts: z.boolean(),
});

/** S-05 — preferințe per utilizator (modele urmărite, prag alertă, buget, țări, alerte email). */
export async function updatePrefs(formData: FormData): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const parsed = prefsSchema.safeParse({
    followed_models: formData.getAll('followed_models').map(String),
    alert_threshold: formData.get('alert_threshold'),
    max_budget: formData.get('max_budget'),
    preferred_countries: formData.getAll('preferred_countries').map(String),
    email_alerts: formData.get('email_alerts') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from('user_prefs')
    .update({
      followed_models: parsed.data.followed_models,
      alert_threshold: parsed.data.alert_threshold,
      max_budget: parsed.data.max_budget,
      preferred_countries: parsed.data.preferred_countries,
      email_alerts: parsed.data.email_alerts,
    })
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/cont/preferinte');
  return { ok: true };
}
