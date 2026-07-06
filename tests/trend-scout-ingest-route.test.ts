// Testează direct handler-ul POST /api/trend-scout-ingest — validare token,
// inserare în forum_posts, declanșarea automată a analizei Trend-Scout
// (best-effort — poate eșua fără ANTHROPIC_API_KEY, dar postările tot
// trebuie inserate corect).
import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { POST } from '../app/api/trend-scout-ingest/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.AGENT_REPORT_TOKEN;
const canRun = Boolean(url && serviceKey && token);

function makeRequest(body: unknown, authHeader?: string) {
  return new NextRequest('http://localhost/api/trend-scout-ingest', {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : {},
    body: JSON.stringify(body),
  });
}

const TEST_TEXT_MARKER = 'TEST-TREND-SCOUT-INGEST fragment de discutie pentru un W124 superb';

describe.runIf(canRun)('POST /api/trend-scout-ingest', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });

  afterEach(async () => {
    await admin.from('forum_posts').delete().eq('text', TEST_TEXT_MARKER);
    await admin.from('agent_runs').delete().eq('agent_id', 'trend-scout').eq('trigger_source', 'forum_ingest');
  });

  it('respinge fără token', async () => {
    const res = await POST(makeRequest({ posts: [] }));
    expect(res.status).toBe(401);
  });

  it('respinge cu token greșit', async () => {
    const res = await POST(makeRequest({ posts: [] }, 'Bearer token-gresit'));
    expect(res.status).toBe(401);
  });

  it('respinge o dată în format greșit', async () => {
    const res = await POST(
      makeRequest({ posts: [{ text: TEST_TEXT_MARKER, date: '06/07/2026' }] }, `Bearer ${token}`)
    );
    expect(res.status).toBe(400);
  });

  it('acceptă o listă goală și tot rulează analiza (fără să eșueze)', async () => {
    const res = await POST(makeRequest({ posts: [] }, `Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.inserted).toBe(0);
  });

  it('inserează postările în forum_posts și încearcă analiza Trend-Scout', async () => {
    const res = await POST(
      makeRequest({ posts: [{ text: TEST_TEXT_MARKER, date: '2026-06-15', source: 'test-forum' }] }, `Bearer ${token}`)
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.inserted).toBe(1);
    // trendRunOk poate fi true/false în funcție de ANTHROPIC_API_KEY, dar câmpul trebuie să existe mereu
    expect(typeof json.trendRunOk).toBe('boolean');

    const { data } = await admin.from('forum_posts').select('*').eq('text', TEST_TEXT_MARKER).single();
    expect(data.post_date).toBe('2026-06-15');
    expect(data.source).toBe('test-forum');
  });

  it('loghează execuția Trend-Scout în agent_runs cu trigger_source forum_ingest', async () => {
    await POST(makeRequest({ posts: [{ text: TEST_TEXT_MARKER, date: '2026-06-15' }] }, `Bearer ${token}`));

    const { data } = await admin
      .from('agent_runs')
      .select('agent_id,trigger_source,status')
      .eq('agent_id', 'trend-scout')
      .eq('trigger_source', 'forum_ingest')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(data!.agent_id).toBe('trend-scout');
    expect(['success', 'error']).toContain(data!.status);
  });
});

if (!canRun) {
  describe.skip('POST /api/trend-scout-ingest (necesită AGENT_REPORT_TOKEN + SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
