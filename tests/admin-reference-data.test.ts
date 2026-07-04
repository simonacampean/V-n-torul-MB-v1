// AD-01 — verifică pe Supabase Cloud real că RLS-ul existent (`models_admin_write`,
// `platforms_admin_write`, definite în 0001_schema.sql) permite CRUD complet unui
// admin prin sesiunea proprie (fără client de tip service-role), și că un
// utilizator obișnuit e blocat. Server actions (formData/redirect) nu pot fi
// apelate direct în teste (depind de next/headers), deci verificăm exact
// stratul pe care se bazează: politicile RLS + constrângerile de schemă
// (inclusiv `hunt_query NOT NULL`, descoperit prin testare live în browser).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && anonKey && serviceKey);

describe.runIf(canRun)('RLS CRUD — target_models & platforms (AD-01)', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  let adminUserId: string;
  let regularUserId: string;
  const adminEmail = `test-ad01-admin-${Date.now()}@example.com`;
  const regularEmail = `test-ad01-user-${Date.now()}@example.com`;

  async function sessionClientFor(email: string) {
    const { data } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const client = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    await client.auth.verifyOtp({ type: 'email', token_hash: data!.properties!.hashed_token });
    return client;
  }

  beforeAll(async () => {
    const { data: a } = await admin.auth.admin.createUser({ email: adminEmail, password: 'Parola-AD01-Admin!', email_confirm: true });
    adminUserId = a!.user!.id;
    await admin.from('profiles').update({ role: 'admin' }).eq('user_id', adminUserId);

    const { data: u } = await admin.auth.admin.createUser({ email: regularEmail, password: 'Parola-AD01-User!', email_confirm: true });
    regularUserId = u!.user!.id;
  });

  afterAll(async () => {
    await admin.from('target_models').delete().eq('code', 'ADTEST');
    await admin.from('platforms').delete().eq('name', '[TEST-AD01] Platformă');
    if (adminUserId) await admin.auth.admin.deleteUser(adminUserId);
    if (regularUserId) await admin.auth.admin.deleteUser(regularUserId);
  });

  it('adminul poate crea/edita/șterge un model țintă prin sesiunea proprie', async () => {
    const adminClient = await sessionClientFor(adminEmail);

    const { error: insErr } = await adminClient.from('target_models').insert({
      code: 'ADTEST', name: 'Test AD-01', years: '2000–2010', year_from: 2000, year_to: 2010,
      band_lo: 1000, band_hi: 2000, body: 'sedan', thesis: 't', checklist: [], tags: [],
      verdict: 'v', gallery_query: 'q', hunt_query: 'ADTEST', active: true,
    });
    expect(insErr).toBeNull();

    const { error: updErr } = await adminClient.from('target_models').update({ band_hi: 2500 }).eq('code', 'ADTEST');
    expect(updErr).toBeNull();
    const { data: after } = await admin.from('target_models').select('band_hi').eq('code', 'ADTEST').single();
    expect(after?.band_hi).toBe(2500);

    const { error: delErr } = await adminClient.from('target_models').delete().eq('code', 'ADTEST');
    expect(delErr).toBeNull();
    const { data: gone } = await admin.from('target_models').select('code').eq('code', 'ADTEST').maybeSingle();
    expect(gone).toBeNull();
  });

  it('un utilizator obișnuit NU poate crea un model țintă (RLS blochează)', async () => {
    const userClient = await sessionClientFor(regularEmail);
    const { error, data } = await userClient
      .from('target_models')
      .insert({
        code: 'ADTEST', name: 'x', years: 'x', year_from: 2000, year_to: 2010, band_lo: 1, band_hi: 2,
        body: 'sedan', thesis: 't', checklist: [], tags: [], verdict: 'v', gallery_query: 'q', hunt_query: 'x',
      })
      .select();
    expect(data).toBeFalsy();
    expect(error).toBeTruthy();
  });

  it('lipsa hunt_query respinge inserarea (coloană NOT NULL) — bug găsit prin testare live', async () => {
    const { error } = await admin.from('target_models').insert({
      code: 'ADTEST', name: 'x', years: 'x', year_from: 2000, year_to: 2010, band_lo: 1, band_hi: 2,
      body: 'sedan', thesis: 't', checklist: [], tags: [], verdict: 'v', gallery_query: 'q',
    });
    expect(error?.message).toContain('hunt_query');
  });

  it('adminul poate crea/edita/șterge o platformă prin sesiunea proprie', async () => {
    const adminClient = await sessionClientFor(adminEmail);

    const { error: insErr, data: inserted } = await adminClient
      .from('platforms')
      .insert({ name: '[TEST-AD01] Platformă', country: 'DE', grp: 'major', negotiability: 'PARTIAL', connector_type: 'manual', active: true })
      .select('id')
      .single();
    expect(insErr).toBeNull();

    const { error: updErr } = await adminClient.from('platforms').update({ active: false }).eq('id', inserted!.id);
    expect(updErr).toBeNull();

    const { error: delErr } = await adminClient.from('platforms').delete().eq('id', inserted!.id);
    expect(delErr).toBeNull();
  });
});
