// Testează direct handler-ul POST /api/agent-report (fără server HTTP pornit,
// ca să funcționeze și în CI) — validare token, respingere payload invalid,
// stocare ca draft „pending" (nu import direct).
import { describe, it, expect, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { POST } from '../app/api/agent-report/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.AGENT_REPORT_TOKEN;
const canRun = Boolean(url && serviceKey && token);

function makeRequest(body: string, authHeader?: string) {
  return new NextRequest('http://localhost/api/agent-report', {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : {},
    body,
  });
}

describe.runIf(canRun)('POST /api/agent-report', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const createdDraftIds: string[] = [];

  afterAll(async () => {
    for (const id of createdDraftIds) {
      await admin.from('agent_report_drafts').delete().eq('id', id);
    }
  });

  it('respinge fără token', async () => {
    const res = await POST(makeRequest('{"offers":[]}'));
    expect(res.status).toBe(401);
  });

  it('respinge cu token greșit', async () => {
    const res = await POST(makeRequest('{"offers":[]}', 'Bearer token-gresit-evident'));
    expect(res.status).toBe(401);
  });

  it('respinge un payload fără offers, chiar cu token corect', async () => {
    const res = await POST(makeRequest('{"generated":"2026-07-03"}', `Bearer ${token}`));
    expect(res.status).toBe(400);
  });

  it('acceptă un raport valid și îl stochează ca draft „pending" — NU importă direct', async () => {
    const body = JSON.stringify({
      generated: '2026-07-03',
      offers: [{ model: 'W124', title: 'Test rutină programată', price: 8500 }],
    });
    const res = await POST(makeRequest(body, `Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.offersReceived).toBe(1);

    const { data: drafts } = await admin
      .from('agent_report_drafts')
      .select('id,status,generated_at,payload')
      .eq('generated_at', '2026-07-03')
      .order('created_at', { ascending: false })
      .limit(1);
    expect(drafts).toHaveLength(1);
    expect(drafts![0].status).toBe('pending');
    createdDraftIds.push(drafts![0].id);

    // draftul NU trebuie să apară deja ca ofertă vie în `offers` — omul aprobă explicit.
    const { data: liveOffers } = await admin.from('offers').select('id').eq('title', 'Test rutină programată');
    expect(liveOffers ?? []).toHaveLength(0);
  });
});

if (!canRun) {
  describe.skip('POST /api/agent-report (necesită AGENT_REPORT_TOKEN + SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
