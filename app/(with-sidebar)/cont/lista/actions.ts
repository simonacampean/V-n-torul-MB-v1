'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CRITERIA, STATUSES, type WatchlistStatus } from '@/lib/scoring';
import { trackEvent } from '@/lib/track';

export type ActionResult = { error: string } | { ok: true };

const todayIso = () => new Date().toISOString().slice(0, 10);
const CRITERION_IDS = CRITERIA.map((c) => c.id);
const COND_IDS = ['1', '2', '3', '4'] as const;

const addItemSchema = z.object({
  model_code: z.string().min(1),
  title: z.string().trim().min(1, 'Titlul e obligatoriu.'),
  price: z.string().optional(),
  url: z.string().optional(),
  year: z.string().optional(),
  km: z.string().optional(),
  note: z.string().optional(),
  cond: z.enum(COND_IDS),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** F-03 — adaugă un anunț urmărit în Lista mea (v5: A.add()). */
export async function addWatchlistItem(formData: FormData): Promise<ActionResult> {
  const parsed = addItemSchema.safeParse({
    model_code: formData.get('model_code'),
    title: formData.get('title'),
    price: formData.get('price'),
    url: formData.get('url'),
    year: formData.get('year'),
    km: formData.get('km'),
    note: formData.get('note'),
    cond: formData.get('cond'),
  });
  if (!parsed.success) {
    await trackEvent('form_error', { action: 'add_watchlist_item', message: parsed.error.issues[0].message });
    return { error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Neautentificat.' };

  const price = parseInt(String(parsed.data.price ?? '').replace(/[^\d]/g, ''), 10);
  const priceNum = Number.isNaN(price) ? null : price;
  const year = parseInt(String(parsed.data.year ?? ''), 10);
  const km = parseInt(String(parsed.data.km ?? '').replace(/[^\d]/g, ''), 10);

  const { error } = await supabase.from('watchlist_items').insert({
    user_id: user.id,
    model_code: parsed.data.model_code,
    title: parsed.data.title,
    price: priceNum,
    url: parsed.data.url || null,
    year: Number.isNaN(year) ? null : year,
    km: Number.isNaN(km) ? null : km,
    note: parsed.data.note || null,
    cond: parsed.data.cond,
    status: 'Nou',
    criteria: {},
    price_history: priceNum != null ? [{ price: priceNum, at: todayIso() }] : [],
  });
  if (error) {
    await trackEvent('form_error', { action: 'add_watchlist_item', message: error.message });
    return { error: error.message };
  }

  await trackEvent('watchlist_item_added', { model_code: parsed.data.model_code });
  revalidatePath('/cont/lista');
  return { ok: true };
}

/** F-03 — bifează/debifează un criteriu de scoring (v5: A.crit()). */
export async function updateCriterion(itemId: string, criterionId: string, checked: boolean): Promise<ActionResult> {
  if (!CRITERION_IDS.includes(criterionId)) return { error: 'Criteriu necunoscut.' };
  const { supabase } = await requireUser();

  const { data: item, error: selErr } = await supabase
    .from('watchlist_items')
    .select('criteria')
    .eq('id', itemId)
    .single();
  if (selErr || !item) return { error: selErr?.message ?? 'Anunț negăsit.' };

  const criteria = { ...(item.criteria ?? {}), [criterionId]: checked };
  const { error } = await supabase.from('watchlist_items').update({ criteria }).eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/cont/lista');
  return { ok: true };
}

/** F-03 — schimbă statusul din pipeline (v5: A.st()). */
export async function updateStatus(itemId: string, status: string): Promise<ActionResult> {
  if (!STATUSES.includes(status as WatchlistStatus)) return { error: 'Status necunoscut.' };
  const { supabase } = await requireUser();

  const { error } = await supabase.from('watchlist_items').update({ status }).eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/cont/lista');
  return { ok: true };
}

/** F-03/F-04 — schimbă gradul de stare folosit la evaluarea prețului (v5: A.cond()). */
export async function updateCond(itemId: string, cond: string): Promise<ActionResult> {
  if (!COND_IDS.includes(cond as (typeof COND_IDS)[number])) return { error: 'Grad de stare necunoscut.' };
  const { supabase } = await requireUser();

  const { error } = await supabase.from('watchlist_items').update({ cond }).eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/cont/lista');
  return { ok: true };
}

/** F-03 — adaugă o intrare nouă în istoricul de preț (v5: A.upPrice()). */
export async function addPriceUpdate(itemId: string, priceStr: string): Promise<ActionResult> {
  const price = parseInt(String(priceStr).replace(/[^\d]/g, ''), 10);
  if (Number.isNaN(price)) return { error: 'Preț invalid.' };
  const { supabase } = await requireUser();

  const { data: item, error: selErr } = await supabase
    .from('watchlist_items')
    .select('price_history')
    .eq('id', itemId)
    .single();
  if (selErr || !item) return { error: selErr?.message ?? 'Anunț negăsit.' };

  const history = Array.isArray(item.price_history) ? item.price_history : [];
  const updatedHistory = [...history, { price, at: todayIso() }];
  const { error } = await supabase
    .from('watchlist_items')
    .update({ price, price_history: updatedHistory })
    .eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/cont/lista');
  return { ok: true };
}

/** F-03 — șterge un anunț din Lista mea (v5: A.del()). */
export async function deleteWatchlistItem(itemId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase.from('watchlist_items').delete().eq('id', itemId);
  if (error) return { error: error.message };

  revalidatePath('/cont/lista');
  return { ok: true };
}
