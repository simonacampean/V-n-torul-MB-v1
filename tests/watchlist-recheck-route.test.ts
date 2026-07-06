// Testează direct handlerele GET/POST /api/watchlist-recheck (fără server HTTP
// pornit) — auth token, listare doar itemi cu url, actualizare price_history
// doar când prețul chiar s-a schimbat (fără intrări duplicate).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GET, POST } from '../app/api/watchlist-recheck/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.AGENT_REPORT_TOKEN;
const canRun = Boolean(url && serviceKey && token);

function makeGet(authHeader?: string) {
  return new NextRequest('http://localhost/api/watchlist-recheck', {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}
function makePost(body: unknown, authHeader?: string) {
  return new NextRequest('http://localhost/api/watchlist-recheck', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(authHeader ? { authorization: authHeader } : {}) },
    body: JSON.stringify(body),
  });
}

describe.runIf(canRun)('GET/POST /api/watchlist-recheck', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId: string;
  let itemWithUrlId: string;
  let itemWithoutUrlId: string;

  beforeAll(async () => {
    const email = `test-recheck-${Date.now()}@example.com`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: 'TestParola123!',
      email_confirm: true,
    });
    if (error) throw error;
    userId = created.user.id;

    const { data: withUrl, error: e1 } = await admin
      .from('watchlist_items')
      .insert({
        user_id: userId,
        model_code: 'W124',
        title: 'TEST-RECHECK cu link',
        price: 9000,
        url: 'https://example.com/anunt-test',
        cond: '2',
      })
      .select('id')
      .single();
    if (e1) throw e1;
    itemWithUrlId = withUrl.id;

    const { data: withoutUrl, error: e2 } = await admin
      .from('watchlist_items')
      .insert({ user_id: userId, model_code: 'W124', title: 'TEST-RECHECK fără link', cond: '2' })
      .select('id')
      .single();
    if (e2) throw e2;
    itemWithoutUrlId = withoutUrl.id;
  });

  afterAll(async () => {
    await admin.from('watchlist_items').delete().in('id', [itemWithUrlId, itemWithoutUrlId]);
    await admin.auth.admin.deleteUser(userId);
  });

  it('GET respinge fără token', async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it('GET respinge cu token greșit', async () => {
    const res = await GET(makeGet('Bearer token-gresit'));
    expect(res.status).toBe(401);
  });

  it('GET întoarce doar itemii cu url completat', async () => {
    const res = await GET(makeGet(`Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    const ids = json.items.map((i: { id: string }) => i.id);
    expect(ids).toContain(itemWithUrlId);
    expect(ids).not.toContain(itemWithoutUrlId);
  });

  it('POST respinge fără token', async () => {
    const res = await POST(makePost({ results: [] }));
    expect(res.status).toBe(401);
  });

  it('POST actualizează price_history când prețul s-a schimbat', async () => {
    const res = await POST(makePost({ results: [{ id: itemWithUrlId, price: 8500 }] }, `Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(1);

    const { data } = await admin.from('watchlist_items').select('price,price_history').eq('id', itemWithUrlId).single();
    expect(data!.price).toBe(8500);
    expect(data!.price_history).toHaveLength(1);
    expect(data!.price_history[0].price).toBe(8500);
  });

  it('POST NU creează intrare duplicată când prețul e identic cu ultimul cunoscut', async () => {
    const res = await POST(makePost({ results: [{ id: itemWithUrlId, price: 8500 }] }, `Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.unchanged).toBe(1);
    expect(json.updated).toBe(0);

    const { data } = await admin.from('watchlist_items').select('price_history').eq('id', itemWithUrlId).single();
    expect(data!.price_history).toHaveLength(1); // tot 1, nu 2
  });

  it('POST respinge un id inexistent ca skipped, fără să pice restul', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await POST(
      makePost({ results: [{ id: fakeId, price: 1000 }, { id: itemWithUrlId, price: 7000 }] }, `Bearer ${token}`)
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(1);
    expect(json.updated).toBe(1);
  });
});

if (!canRun) {
  describe.skip('GET/POST /api/watchlist-recheck (necesită AGENT_REPORT_TOKEN + SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
