// SEC-03 — test obligatoriu: utilizatorul A nu poate citi datele utilizatorului B.
// Rulează împotriva proiectului Supabase Cloud real (fără mediu local) — necesită
// SUPABASE_SERVICE_ROLE_KEY (doar pentru a crea useri de test pre-confirmați;
// cheia nu ajunge niciodată în clienții aplicației).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = Boolean(url && anonKey && serviceKey);

describe.runIf(canRun)('SEC-03 — RLS izolează datele per utilizator', () => {
  const stamp = Date.now();
  const userA = { email: `test-rls-a-${stamp}@vanatorul-mb.test`, password: 'Test-Parola-Rls-A-1' };
  const userB = { email: `test-rls-b-${stamp}@vanatorul-mb.test`, password: 'Test-Parola-Rls-B-2' };

  let idA = '';
  let idB = '';
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let admin: SupabaseClient;

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: createdA, error: errA } = await admin.auth.admin.createUser({
      email: userA.email,
      password: userA.password,
      email_confirm: true,
    });
    if (errA || !createdA.user) throw errA ?? new Error('nu s-a putut crea userul A de test');
    idA = createdA.user.id;

    const { data: createdB, error: errB } = await admin.auth.admin.createUser({
      email: userB.email,
      password: userB.password,
      email_confirm: true,
    });
    if (errB || !createdB.user) throw errB ?? new Error('nu s-a putut crea userul B de test');
    idB = createdB.user.id;

    clientA = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    clientB = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });

    const { error: signInAErr } = await clientA.auth.signInWithPassword(userA);
    if (signInAErr) throw signInAErr;
    const { error: signInBErr } = await clientB.auth.signInWithPassword(userB);
    if (signInBErr) throw signInBErr;

    const { error: insertErr } = await clientA
      .from('watchlist_items')
      .insert({ user_id: idA, model_code: 'W124', title: 'Test RLS — anunț privat A' });
    if (insertErr) throw insertErr;
  });

  afterAll(async () => {
    if (idA) await admin.auth.admin.deleteUser(idA);
    if (idB) await admin.auth.admin.deleteUser(idB);
  });

  it('user A își vede propriul anunț din Lista mea', async () => {
    const { data, error } = await clientA.from('watchlist_items').select('id,title');
    expect(error).toBeNull();
    expect(data?.some((row) => row.title === 'Test RLS — anunț privat A')).toBe(true);
  });

  it('user B NU vede anunțul lui A, nici cu select nefiltrat (RLS, nu filtrare de aplicație)', async () => {
    const { data, error } = await clientB.from('watchlist_items').select('id,title,user_id');
    expect(error).toBeNull();
    expect(data?.some((row) => row.user_id === idA)).toBe(false);
    expect(data?.some((row) => row.title === 'Test RLS — anunț privat A')).toBe(false);
  });

  it('user B nu poate citi direct rândul lui A după id (select filtrat pe user_id)', async () => {
    const { data, error } = await clientB.from('watchlist_items').select('id').eq('user_id', idA);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});

if (!canRun) {
  describe.skip('SEC-03 — RLS izolează datele per utilizator (necesită SUPABASE_SERVICE_ROLE_KEY în .env.local)', () => {
    it('sărit — lipsește SUPABASE_SERVICE_ROLE_KEY', () => {});
  });
}
