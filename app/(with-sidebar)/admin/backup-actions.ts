'use server';

import { createClient } from '@/lib/supabase/server';

export interface ReferenceBackup {
  app: 'VanatorulMB';
  kind: 'reference-data';
  exported: string;
  target_models: unknown[];
  platforms: unknown[];
  transport_costs: unknown[];
  content_pages: unknown[];
  ad_campaigns: unknown[];
}

/**
 * Backup automat DB (M5) — Supabase Cloud pe plan Free NU oferă backup automat
 * gestionat (disponibil abia din planul Pro). Ca plasă de siguranță imediată,
 * fără cost, exportăm datele de referință/business (NU date personale de
 * utilizator — acelea au propriul export GDPR-02 în /cont/date) într-un JSON
 * descărcabil, la cerere, din dashboard-ul admin.
 */
export async function exportReferenceBackup(): Promise<{ data: ReferenceBackup } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Doar administratorii pot face asta.' };

  const [models, platforms, transportCosts, pages, ads] = await Promise.all([
    supabase.from('target_models').select('*').order('code'),
    supabase.from('platforms').select('*').order('name'),
    supabase.from('transport_costs').select('*').order('country_code'),
    supabase.from('content_pages').select('*').order('slug'),
    supabase.from('ad_campaigns').select('*').order('created_at'),
  ]);

  return {
    data: {
      app: 'VanatorulMB',
      kind: 'reference-data',
      exported: new Date().toISOString(),
      target_models: models.data ?? [],
      platforms: platforms.data ?? [],
      transport_costs: transportCosts.data ?? [],
      content_pages: pages.data ?? [],
      ad_campaigns: ads.data ?? [],
    },
  };
}
