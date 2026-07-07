// Testează direct handler-ul POST /api/agent-report (fără server HTTP pornit,
// ca să funcționeze și în CI) — validare token, respingere payload invalid,
// și noul flux de auto-import + auto-aprobare cu gate de siguranță (vezi
// evalueazaGateAutoAprobare din lib/server/offers-import.ts).
import { describe, it, expect, afterEach } from 'vitest';
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
  const createdOfferTitles: string[] = [];

  afterEach(async () => {
    if (createdOfferTitles.length) {
      const { data: offs } = await admin.from('offers').select('id').in('title', createdOfferTitles);
      const ids = (offs ?? []).map((o) => o.id);
      if (ids.length) {
        await admin.from('agent_runs').delete().in('related_offer_id', ids);
        await admin.from('offer_price_history').delete().in('offer_id', ids);
      }
      await admin.from('offers').delete().in('title', createdOfferTitles);
      createdOfferTitles.length = 0;
    }
    for (const id of createdDraftIds.splice(0)) {
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

  it('acceptă offers:[] cu token corect ⇒ 200 (heartbeat obligatoriu al rutinei programate, chiar fără oferte noi găsite)', async () => {
    const res = await POST(makeRequest('{"generated":"2026-07-03","offers":[]}', `Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.offersReceived).toBe(0);
    expect(json.autoInserted).toBe(0);
    expect(json.deferredForManualReview).toBe(0);

    const { data: drafts } = await admin
      .from('agent_report_drafts')
      .select('id,status')
      .eq('generated_at', '2026-07-03')
      .order('created_at', { ascending: false })
      .limit(1);
    createdDraftIds.push(drafts![0].id);
    expect(drafts![0].status).toBe('imported'); // nimic de procesat ⇒ draftul se consideră rezolvat instant
  });

  it('anunț fără text de analizat ⇒ auto-aprobat instant (nimic suspect posibil)', async () => {
    const title = `TEST-AGENT-REPORT fără note ${Date.now()}`;
    createdOfferTitles.push(title);
    const body = JSON.stringify({
      generated: '2026-07-03',
      offers: [{ model: 'W124', title, price: 8500 }],
    });
    const res = await POST(makeRequest(body, `Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.autoInserted).toBe(1);
    expect(json.autoApproved).toBe(1);
    expect(json.needsManualReview).toBe(0);
    expect(json.deferredForManualReview).toBe(0);

    const { data: drafts } = await admin
      .from('agent_report_drafts')
      .select('id,status')
      .eq('generated_at', '2026-07-03')
      .order('created_at', { ascending: false })
      .limit(1);
    createdDraftIds.push(drafts![0].id);
    expect(drafts![0].status).toBe('imported'); // tot ce era de inserat s-a procesat acum

    const { data: offer } = await admin.from('offers').select('moderation').eq('title', title).single();
    expect(offer!.moderation).toBe('approved');
  });

  it('anunț CU note, dar agentul de siguranță eșuează (fără cheie API) ⇒ rămâne „pending" (fail-safe)', async () => {
    const title = `TEST-AGENT-REPORT cu note ${Date.now()}`;
    createdOfferTitles.push(title);
    const body = JSON.stringify({
      generated: '2026-07-03',
      offers: [{ model: 'W124', title, price: 8500, note: 'Mașină în stare bună, km reali.' }],
    });
    const res = await POST(makeRequest(body, `Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.autoInserted).toBe(1);
    expect(json.autoApproved).toBe(0);
    expect(json.needsManualReview).toBe(1);

    const { data: drafts } = await admin
      .from('agent_report_drafts')
      .select('id')
      .eq('generated_at', '2026-07-03')
      .order('created_at', { ascending: false })
      .limit(1);
    createdDraftIds.push(drafts![0].id);

    const { data: offer } = await admin.from('offers').select('moderation').eq('title', title).single();
    expect(offer!.moderation).toBe('pending'); // fără semnal de siguranță clar, NU se auto-aprobă
  });

  it('plafonează auto-procesarea la 3 anunțuri noi, restul rămân în draft „pending"', async () => {
    const stamp = Date.now();
    const titles = [0, 1, 2, 3].map((i) => `TEST-AGENT-REPORT plafon ${i} ${stamp}`);
    titles.forEach((t) => createdOfferTitles.push(t));
    const body = JSON.stringify({
      generated: '2026-07-03',
      offers: titles.map((title) => ({ model: 'W124', title, price: 8500 })),
    });
    const res = await POST(makeRequest(body, `Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.autoInserted).toBe(3); // plafon
    expect(json.deferredForManualReview).toBe(1); // al 4-lea rămâne

    const { data: drafts } = await admin
      .from('agent_report_drafts')
      .select('id,status')
      .eq('generated_at', '2026-07-03')
      .order('created_at', { ascending: false })
      .limit(1);
    createdDraftIds.push(drafts![0].id);
    expect(drafts![0].status).toBe('pending'); // nu tot draftul a fost procesat — rămâne pentru aprobare manuală ulterioară

    const { data: liveOffers } = await admin.from('offers').select('id').in('title', titles);
    expect(liveOffers ?? []).toHaveLength(3); // doar primele 3 au fost inserate acum
  });
});

if (!canRun) {
  describe.skip('POST /api/agent-report (necesită AGENT_REPORT_TOKEN + SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
