// SEC-04 — jurnal de audit pe Supabase Cloud real: verifică inserarea prin
// clientul admin, RLS (doar admin citește, nimeni nu scrie prin sesiunea
// proprie) și tratarea erorilor fără a bloca acțiunea reală a userului.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '../lib/audit';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && anonKey && serviceKey);

describe.runIf(canRun)('logAudit — jurnal de audit (SEC-04)', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId: string;
  const email = `test-audit-${Date.now()}@example.com`;

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: 'Parola-Audit-Test-123!',
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  });

  afterAll(async () => {
    await admin.from('audit_log').delete().eq('user_id', userId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it('inserează un rând complet prin clientul admin', async () => {
    await logAudit('login', { userId, email, detail: { via: 'password' } });

    const { data } = await admin.from('audit_log').select('*').eq('user_id', userId).eq('action', 'login').single();
    expect(data?.actor_email).toBe(email);
    expect(data?.detail).toEqual({ via: 'password' });
  });

  it('un utilizator obișnuit NU poate insera direct în audit_log (fără politică INSERT)', async () => {
    const { data: signIn } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const userClient = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    const hashedToken = signIn?.properties?.hashed_token;
    expect(hashedToken).toBeTruthy();
    const { data: verified } = await userClient.auth.verifyOtp({ type: 'email', token_hash: hashedToken! });
    expect(verified.session).toBeTruthy();

    const { error, data: inserted } = await userClient
      .from('audit_log')
      .insert({ user_id: userId, action: 'login', detail: {} })
      .select();
    // RLS fără politică INSERT ⇒ eroare de permisiune, nu inserare silențioasă.
    expect(inserted).toBeFalsy();
    expect(error).toBeTruthy();
  });

  it('un utilizator obișnuit NU poate citi audit_log (nici măcar propriile rânduri)', async () => {
    const { data: signIn } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const userClient = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    const hashedToken = signIn?.properties?.hashed_token;
    await userClient.auth.verifyOtp({ type: 'email', token_hash: hashedToken! });

    const { data } = await userClient.from('audit_log').select('*').eq('user_id', userId);
    expect(data).toEqual([]); // RLS filtrează silențios (USING), nu aruncă eroare
  });

  it('nu aruncă excepție dacă scrierea eșuează (nu blochează acțiunea reală)', async () => {
    await expect(logAudit('login', { userId: 'nu-e-un-uuid-valid' })).resolves.toBeUndefined();
  });
});
