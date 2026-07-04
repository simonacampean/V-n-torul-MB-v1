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

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function csvToArray(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// z.string().optional() acceptă doar `undefined`, nu și `null` — dar
// formData.get() întoarce `null` pentru inputuri absente (ex.: checkbox
// nebifat), nu `undefined`. .nullish() acoperă ambele cazuri.
const modelFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Numele e obligatoriu.'),
  years: z.string().trim().min(1, 'Perioada de producție e obligatorie.'),
  year_from: z.coerce.number().int(),
  year_to: z.coerce.number().int(),
  band_lo: z.coerce.number().int().nonnegative(),
  band_hi: z.coerce.number().int().nonnegative(),
  body: z.enum(['sedan', 'coupe', 'roadster']),
  thesis: z.string().trim().min(1, 'Teza de investiție e obligatorie.'),
  checklist: z.string(),
  tags: z.string(),
  verdict: z.string().trim().min(1, 'Verdictul e obligatoriu.'),
  gallery_query: z.string().trim().min(1, 'Interogarea pentru galerie e obligatorie.'),
  hunt_query: z.string().trim().min(1, 'Interogarea de căutare (F-02) e obligatorie.'),
  prod_note: z.string().nullish(),
  active: z.string().nullish(),
});
const createModelSchema = modelFieldsSchema.extend({
  code: z.string().trim().min(1, 'Codul modelului e obligatoriu.').toUpperCase(),
});

function readModelFields(formData: FormData) {
  return {
    name: formData.get('name'),
    years: formData.get('years'),
    year_from: formData.get('year_from'),
    year_to: formData.get('year_to'),
    band_lo: formData.get('band_lo'),
    band_hi: formData.get('band_hi'),
    body: formData.get('body'),
    thesis: formData.get('thesis'),
    checklist: formData.get('checklist'),
    tags: formData.get('tags'),
    verdict: formData.get('verdict'),
    gallery_query: formData.get('gallery_query'),
    hunt_query: formData.get('hunt_query'),
    prod_note: formData.get('prod_note'),
    active: formData.get('active'),
  };
}

/** AD-01 — creare model țintă. RLS `models_admin_write` permite scriere doar adminilor. */
export async function createModel(formData: FormData): Promise<void> {
  const check = await requireAdmin();
  if ('error' in check) redirect(`/admin/modele?err=${encodeURIComponent(check.error)}`);

  const parsed = createModelSchema.safeParse({ ...readModelFields(formData), code: formData.get('code') });
  if (!parsed.success) redirect(`/admin/modele?err=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const { error } = await check.supabase.from('target_models').insert({
    code: parsed.data.code,
    name: parsed.data.name,
    years: parsed.data.years,
    year_from: parsed.data.year_from,
    year_to: parsed.data.year_to,
    band_lo: parsed.data.band_lo,
    band_hi: parsed.data.band_hi,
    body: parsed.data.body,
    thesis: parsed.data.thesis,
    checklist: linesToArray(parsed.data.checklist),
    tags: csvToArray(parsed.data.tags),
    verdict: parsed.data.verdict,
    gallery_query: parsed.data.gallery_query,
    hunt_query: parsed.data.hunt_query,
    prod_note: parsed.data.prod_note || null,
    active: parsed.data.active === 'on',
  });
  if (error) redirect(`/admin/modele?err=${encodeURIComponent(error.message)}`);

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'create_model', code: parsed.data.code } });
  revalidatePath('/admin/modele');
  revalidatePath('/');
  redirect('/admin/modele');
}

export async function updateModel(code: string, formData: FormData): Promise<void> {
  const check = await requireAdmin();
  if ('error' in check) redirect(`/admin/modele/${code}?err=${encodeURIComponent(check.error)}`);

  const parsed = modelFieldsSchema.safeParse(readModelFields(formData));
  if (!parsed.success) redirect(`/admin/modele/${code}?err=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const { error } = await check.supabase
    .from('target_models')
    .update({
      name: parsed.data.name,
      years: parsed.data.years,
      year_from: parsed.data.year_from,
      year_to: parsed.data.year_to,
      band_lo: parsed.data.band_lo,
      band_hi: parsed.data.band_hi,
      body: parsed.data.body,
      thesis: parsed.data.thesis,
      checklist: linesToArray(parsed.data.checklist),
      tags: csvToArray(parsed.data.tags),
      verdict: parsed.data.verdict,
      gallery_query: parsed.data.gallery_query,
      hunt_query: parsed.data.hunt_query,
      prod_note: parsed.data.prod_note || null,
      active: parsed.data.active === 'on',
    })
    .eq('code', code);
  if (error) redirect(`/admin/modele/${code}?err=${encodeURIComponent(error.message)}`);

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'update_model', code } });
  revalidatePath('/admin/modele');
  revalidatePath(`/admin/modele/${code}`);
  revalidatePath('/');
  redirect(`/admin/modele/${code}?ok=1`);
}

export async function deleteModel(code: string): Promise<{ error: string } | { ok: true }> {
  const check = await requireAdmin();
  if ('error' in check) return { error: check.error };

  const { error } = await check.supabase.from('target_models').delete().eq('code', code);
  if (error) return { error: error.message };

  await logAudit('admin_action', { userId: check.user.id, email: check.user.email, detail: { action: 'delete_model', code } });
  revalidatePath('/admin/modele');
  revalidatePath('/');
  return { ok: true };
}
