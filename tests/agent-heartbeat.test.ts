// Observabilitate rutină programată (AD-05 extins) — agent_heartbeats trebuie
// să reflecte „ultima rulare reușită" per pipeline, chiar și când nu există
// nimic de procesat (partea B, recheck Lista mea, nu scrie nimic altundeva
// în DB în acel caz — de asta a existat un unghi mort de observabilitate).
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { POST as agentReportPost } from '../app/api/agent-report/route';
import { POST as watchlistRecheckPost } from '../app/api/watchlist-recheck/route';
import { POST as trendScoutPost } from '../app/api/trend-scout-ingest/route';
import { recordHeartbeat, PIPELINES } from '../lib/agent-heartbeat';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.AGENT_REPORT_TOKEN;
const canRun = Boolean(url && serviceKey && token);

function makeRequest(path: string, body: unknown, authHeader?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(authHeader ? { authorization: authHeader } : {}) },
    body: JSON.stringify(body),
  });
}

describe.runIf(canRun)('agent_heartbeats — observabilitate rutină programată', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const createdOfferTitles: string[] = [];
  // Testele astea chiar scriu în agent_heartbeats (tabelă cu un singur rând
  // "adevărat" per pipeline, citită de banner-ul din /admin/agenti) — salvăm
  // starea dinainte și o restaurăm la final, ca rularea testelor să nu
  // corupă semnalul real de sănătate cu timestamp-uri/rezumate de test.
  let snapshot: Array<{ pipeline: string; last_run_at: string; last_summary: unknown }> = [];

  beforeAll(async () => {
    const { data } = await admin.from('agent_heartbeats').select('pipeline,last_run_at,last_summary');
    snapshot = data ?? [];
  });

  afterAll(async () => {
    if (snapshot.length) {
      await admin.from('agent_heartbeats').upsert(snapshot);
    } else {
      await admin.from('agent_heartbeats').delete().in('pipeline', PIPELINES as unknown as string[]);
    }
  });

  afterEach(async () => {
    if (createdOfferTitles.length) {
      const { data: offs } = await admin.from('offers').select('id').in('title', createdOfferTitles);
      const ids = (offs ?? []).map((o) => o.id);
      if (ids.length) {
        await admin.from('agent_runs').delete().in('related_offer_id', ids);
        await admin.from('offers').delete().in('id', ids);
      }
      createdOfferTitles.length = 0;
    }
  });

  it('recordHeartbeat face upsert — a doua chemare suprascrie last_run_at, nu duplică rândul', async () => {
    await recordHeartbeat(admin, 'agent_report', { test: 1 });
    const first = await admin.from('agent_heartbeats').select('last_run_at').eq('pipeline', 'agent_report').single();

    await new Promise((r) => setTimeout(r, 10));
    await recordHeartbeat(admin, 'agent_report', { test: 2 });
    const second = await admin.from('agent_heartbeats').select('last_run_at').eq('pipeline', 'agent_report').single();

    const { count } = await admin
      .from('agent_heartbeats')
      .select('*', { count: 'exact', head: true })
      .eq('pipeline', 'agent_report');
    expect(count).toBe(1);
    expect(new Date(second.data!.last_run_at).getTime()).toBeGreaterThan(new Date(first.data!.last_run_at).getTime());
  });

  it('POST /api/agent-report cu offers:[] (heartbeat gol) actualizează agent_heartbeats.agent_report', async () => {
    const res = await agentReportPost(makeRequest('/api/agent-report', { generated: '2026-07-07', offers: [] }, `Bearer ${token}`));
    expect(res.status).toBe(200);

    const { data } = await admin.from('agent_heartbeats').select('last_run_at,last_summary').eq('pipeline', 'agent_report').single();
    expect(data).not.toBeNull();
    expect(Date.now() - new Date(data!.last_run_at).getTime()).toBeLessThan(10_000);
  });

  it('POST /api/watchlist-recheck cu results:[] actualizează agent_heartbeats.watchlist_recheck', async () => {
    const res = await watchlistRecheckPost(makeRequest('/api/watchlist-recheck', { results: [] }, `Bearer ${token}`));
    expect(res.status).toBe(200);

    const { data } = await admin
      .from('agent_heartbeats')
      .select('last_run_at')
      .eq('pipeline', 'watchlist_recheck')
      .single();
    expect(data).not.toBeNull();
    expect(Date.now() - new Date(data!.last_run_at).getTime()).toBeLessThan(10_000);
  });

  it('POST /api/trend-scout-ingest cu posts:[] actualizează agent_heartbeats.trend_scout', async () => {
    const res = await trendScoutPost(makeRequest('/api/trend-scout-ingest', { posts: [] }, `Bearer ${token}`));
    expect(res.status).toBe(200);

    const { data } = await admin.from('agent_heartbeats').select('last_run_at').eq('pipeline', 'trend_scout').single();
    expect(data).not.toBeNull();
    expect(Date.now() - new Date(data!.last_run_at).getTime()).toBeLessThan(10_000);
  });

  it('PIPELINES conține exact cele 3 chei folosite de rutina programată', () => {
    expect(PIPELINES).toEqual(['agent_report', 'watchlist_recheck', 'trend_scout']);
  });
});

if (!canRun) {
  describe.skip('agent_heartbeats (necesită AGENT_REPORT_TOKEN + SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
