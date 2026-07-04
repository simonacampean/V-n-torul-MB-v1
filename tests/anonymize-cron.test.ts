// GDPR-02 — testează handler-ul GET /api/cron/anonymize direct: autorizare
// prin CRON_SECRET, ștergerea reală (cascadă) a conturilor a căror grație de
// 30 de zile a expirat, și că offers.submitted_by devine null în loc să
// blocheze ștergerea (migrarea 0011 a schimbat FK-ul la ON DELETE SET NULL).
import { describe, it, expect, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GET } from '../app/api/cron/anonymize/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.CRON_SECRET;
const canRun = Boolean(url && serviceKey && secret);

function makeRequest(authHeader?: string) {
  return new NextRequest('http://localhost/api/cron/anonymize', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe.runIf(canRun)('GET /api/cron/anonymize', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const createdUserIds: string[] = [];
  const createdOfferIds: string[] = [];

  afterAll(async () => {
    for (const id of createdOfferIds) await admin.from('offers').delete().eq('id', id);
    for (const id of createdUserIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  });

  it('respinge fără token', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('respinge cu token greșit', async () => {
    const res = await GET(makeRequest('Bearer token-gresit-evident'));
    expect(res.status).toBe(401);
  });

  it('șterge definitiv un cont cu grația expirată (31 zile), cascadând corect', async () => {
    const { data: userData } = await admin.auth.admin.createUser({
      email: `test-anonymize-${Date.now()}@example.com`,
      password: 'Parola-Anonymize-Test-123!',
      email_confirm: true,
    });
    const userId = userData!.user!.id;
    createdUserIds.push(userId);

    await admin.from('profiles').update({ deletion_requested_at: daysAgoIso(31) }).eq('user_id', userId);
    await admin.from('watchlist_items').insert({ user_id: userId, model_code: 'W124', title: 'Test anonimizare' });

    const { data: offer } = await admin
      .from('offers')
      .insert({
        model_code: 'W124', title: '[TEST-ANON] anunț cu submitted_by',
        price: 9000, submitted_by: userId, moderation: 'pending', status: 'active',
      })
      .select('id')
      .single();
    createdOfferIds.push(offer!.id);

    const res = await GET(makeRequest(`Bearer ${secret}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.anonymized).toBeGreaterThanOrEqual(1);

    const { data: deletedUser, error: getErr } = await admin.auth.admin.getUserById(userId);
    expect(deletedUser?.user ?? null).toBeNull();
    expect(getErr).toBeTruthy();

    const { data: profileRow } = await admin.from('profiles').select('user_id').eq('user_id', userId).maybeSingle();
    expect(profileRow).toBeNull();

    const { data: watchlistRows } = await admin.from('watchlist_items').select('id').eq('user_id', userId);
    expect(watchlistRows ?? []).toHaveLength(0);

    const { data: offerAfter } = await admin.from('offers').select('submitted_by').eq('id', offer!.id).single();
    expect(offerAfter?.submitted_by).toBeNull();
  });

  it('NU șterge un cont încă în perioada de grație (5 zile)', async () => {
    const { data: userData } = await admin.auth.admin.createUser({
      email: `test-grace-${Date.now()}@example.com`,
      password: 'Parola-Grace-Test-123!',
      email_confirm: true,
    });
    const userId = userData!.user!.id;
    createdUserIds.push(userId);

    await admin.from('profiles').update({ deletion_requested_at: daysAgoIso(5) }).eq('user_id', userId);

    const res = await GET(makeRequest(`Bearer ${secret}`));
    expect(res.status).toBe(200);

    const { data: stillThere } = await admin.auth.admin.getUserById(userId);
    expect(stillThere?.user).toBeTruthy();
  });
});

if (!canRun) {
  describe.skip('GET /api/cron/anonymize (necesită CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
