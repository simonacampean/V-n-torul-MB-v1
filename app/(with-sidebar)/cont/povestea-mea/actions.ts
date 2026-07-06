'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parsePrice } from '@/lib/scoring';
import { trackEvent } from '@/lib/track';

const successStorySchema = z.object({
  model_code: z.string().min(1, 'Alege un model.'),
  an_fabricatie: z.string().optional(),
  pret_achizitie: z.string().min(1, 'Prețul de achiziție e obligatoriu.'),
  pret_mediu_piata_atunci: z.string().optional(),
  nume_afisat: z.string().trim().max(80, 'Maxim 80 de caractere.').optional(),
  text_poveste: z.string().trim().min(20, 'Povestea ta are nevoie de măcar câteva propoziții (minim 20 caractere).').max(2000, 'Maxim 2000 de caractere.'),
});

/**
 * „Vânători Reușite" — userul își trimite propria poveste. Prin sesiunea
 * proprie (nu admin) — RLS (success_stories_user_insert) impune
 * user_id = auth.uid() și moderation = 'pending', deci nu se poate
 * auto-aproba. `nume_afisat` e complet opțional și scris chiar de user —
 * nu tragem niciodată automat numele/emailul din cont pentru afișare publică.
 */
export async function submitSuccessStory(formData: FormData): Promise<{ error: string } | { ok: true }> {
  const parsed = successStorySchema.safeParse({
    model_code: formData.get('model_code'),
    an_fabricatie: formData.get('an_fabricatie'),
    pret_achizitie: formData.get('pret_achizitie'),
    pret_mediu_piata_atunci: formData.get('pret_mediu_piata_atunci'),
    nume_afisat: formData.get('nume_afisat'),
    text_poveste: formData.get('text_poveste'),
  });
  if (!parsed.success) {
    await trackEvent('form_error', { action: 'submit_success_story', message: parsed.error.issues[0].message });
    return { error: parsed.error.issues[0].message };
  }

  const pretAchizitie = parsePrice(parsed.data.pret_achizitie);
  if (pretAchizitie == null) {
    return { error: 'Preț de achiziție invalid.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const { error } = await supabase.from('success_stories').insert({
    user_id: user.id,
    model_code: parsed.data.model_code,
    an_fabricatie: parsePrice(parsed.data.an_fabricatie),
    pret_achizitie: pretAchizitie,
    pret_mediu_piata_atunci: parsePrice(parsed.data.pret_mediu_piata_atunci),
    nume_afisat: parsed.data.nume_afisat || null,
    text_poveste: parsed.data.text_poveste,
    moderation: 'pending',
  });
  if (error) {
    await trackEvent('form_error', { action: 'submit_success_story', message: error.message });
    return { error: error.message };
  }

  await trackEvent('success_story_submitted', { model_code: parsed.data.model_code });
  revalidatePath('/cont/povestea-mea');
  revalidatePath('/');
  return { ok: true };
}
