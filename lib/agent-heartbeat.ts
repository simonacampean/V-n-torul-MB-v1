import type { SupabaseClient } from '@supabase/supabase-js';

export const PIPELINES = ['agent_report', 'watchlist_recheck', 'trend_scout'] as const;
export type Pipeline = (typeof PIPELINES)[number];

/** Înregistrează o rulare reușită a rutinei programate pentru un pipeline —
 * singura sursă fiabilă de „ultima rulare", pentru că partea B (recheck
 * Lista mea) nu scrie nimic altundeva în DB când nu găsește nicio schimbare
 * de preț/descriere de raportat (agent_report_drafts/forum_posts există
 * doar pentru A/C, și nu ar acoperi cazul „a rulat, dar n-a găsit nimic"). */
export async function recordHeartbeat(
  admin: SupabaseClient,
  pipeline: Pipeline,
  summary: Record<string, unknown>
): Promise<void> {
  await admin.from('agent_heartbeats').upsert({
    pipeline,
    last_run_at: new Date().toISOString(),
    last_summary: summary,
  });
}
