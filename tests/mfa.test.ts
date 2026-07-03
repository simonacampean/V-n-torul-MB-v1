// A-02 — 2FA TOTP end-to-end pe Supabase Cloud real. Generăm coduri TOTP
// valide direct din secretul întors de enroll() (RFC 6238), ca să putem testa
// automat fluxul complet fără o aplicație authenticator reală.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { generateBackupCodes, hashBackupCode } from '../lib/auth/backup-codes';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = Boolean(url && anonKey && serviceKey);

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of input.replace(/=+$/, '').toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function computeTotp(secretBase32: string, atMs: number, step = 30, digits = 6): string {
  const counter = Math.floor(atMs / 1000 / step);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secretBase32);
  const hmac = createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, '0');
}

describe.runIf(canRun)('A-02 — 2FA TOTP end-to-end', () => {
  let admin: SupabaseClient;
  let client: SupabaseClient;
  const stamp = Date.now();
  const testUser = { email: `test-mfa-${stamp}@vanatorul-mb.test`, password: 'Test-Parola-Mfa-1' };
  let userId = '';
  let factorId = '';
  let secret = '';

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: created, error } = await admin.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
    });
    if (error || !created.user) throw error ?? new Error('nu s-a putut crea userul de test');
    userId = created.user.id;

    client = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: signInErr } = await client.auth.signInWithPassword(testUser);
    if (signInErr) throw signInErr;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it('fără 2FA enrolat, AAL rămâne aal1/aal1 — nu se cere al doilea factor', async () => {
    const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(error).toBeNull();
    expect(data?.currentLevel).toBe('aal1');
    expect(data?.nextLevel).toBe('aal1');
  });

  it('enrolează TOTP și confirmă cu un cod real, calculat din secretul întors de Supabase', async () => {
    const { data: enrolled, error: enrollErr } = await client.auth.mfa.enroll({ factorType: 'totp' });
    expect(enrollErr).toBeNull();
    factorId = enrolled!.id;
    secret = enrolled!.totp.secret;

    const code = computeTotp(secret, Date.now());
    const { error: verifyErr } = await client.auth.mfa.challengeAndVerify({ factorId, code });
    expect(verifyErr).toBeNull();

    const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(aal?.currentLevel).toBe('aal2');
  });

  it('un cod TOTP greșit e respins', async () => {
    const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: '000000' });
    expect(error).not.toBeNull();
  });

  it('o sesiune nouă (alt login cu parolă) necesită din nou AAL2 — parola singură nu ajunge', async () => {
    const fresh = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: signInErr } = await fresh.auth.signInWithPassword(testUser);
    expect(signInErr).toBeNull();

    const { data: aal } = await fresh.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(aal?.currentLevel).toBe('aal1');
    expect(aal?.nextLevel).toBe('aal2');

    // codul curent trebuie să ridice explicit sesiunea nouă la aal2
    const code = computeTotp(secret, Date.now());
    const { error: verifyErr } = await fresh.auth.mfa.challengeAndVerify({ factorId, code });
    expect(verifyErr).toBeNull();
  });

  it('coduri de rezervă: se stochează hash-uite și RLS le izolează per utilizator', async () => {
    const codes = generateBackupCodes();
    const rows = codes.map((code) => ({ user_id: userId, code_hash: hashBackupCode(code) }));

    const { error: insErr } = await client.from('mfa_backup_codes').insert(rows);
    expect(insErr).toBeNull();

    const { data: mine, error: selErr } = await client
      .from('mfa_backup_codes')
      .select('id,code_hash')
      .eq('user_id', userId);
    expect(selErr).toBeNull();
    expect(mine).toHaveLength(10);
    expect(mine?.some((r) => r.code_hash === hashBackupCode(codes[0]))).toBe(true);

    const otherUser = { email: `test-mfa-b-${stamp}@vanatorul-mb.test`, password: 'Test-Parola-Mfa-B-2' };
    const { data: createdB, error: createErrB } = await admin.auth.admin.createUser({
      email: otherUser.email,
      password: otherUser.password,
      email_confirm: true,
    });
    expect(createErrB).toBeNull();
    const clientB = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    await clientB.auth.signInWithPassword(otherUser);
    const { data: seenByB, error: selBErr } = await clientB
      .from('mfa_backup_codes')
      .select('id')
      .eq('user_id', userId);
    expect(selBErr).toBeNull();
    expect(seenByB).toHaveLength(0);
    if (createdB.user) await admin.auth.admin.deleteUser(createdB.user.id);
  });

  it('recuperare prin cod de rezervă: fără refreshSession(), sesiunea deja deschisă rămâne blocată cerând aal2 pentru un factor tocmai șters — bug reprodus și corectat', async () => {
    // Sesiune deschisă ÎNAINTE de ștergere — exact scenariul real de pe /verifica-2fa:
    // userul e la mijlocul verificării (aal1, nextLevel aal2) când folosește codul de rezervă.
    const recovering = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: signInErr } = await recovering.auth.signInWithPassword(testUser);
    expect(signInErr).toBeNull();

    const before = await recovering.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(before.data?.nextLevel).toBe('aal2');

    const { error: delErr } = await admin.auth.admin.mfa.deleteFactor({ id: factorId, userId });
    expect(delErr).toBeNull();

    // getAuthenticatorAssuranceLevel() fără jwt citește sesiunea din cache local (getSession()),
    // nu o reverifică live — fără refresh, tot cere aal2 deși factorul nu mai există.
    const stale = await recovering.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(stale.data?.nextLevel).toBe('aal2');

    // fix-ul din verifyBackupCodeAndRecover (mfa-actions.ts): refreshSession() readuce nextLevel la aal1.
    await recovering.auth.refreshSession();
    const fixed = await recovering.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(fixed.data?.currentLevel).toBe('aal1');
    expect(fixed.data?.nextLevel).toBe('aal1');
  });
});

if (!canRun) {
  describe.skip('A-02 — 2FA TOTP end-to-end (necesită SUPABASE_SERVICE_ROLE_KEY în .env.local)', () => {
    it('sărit — lipsește SUPABASE_SERVICE_ROLE_KEY', () => {});
  });
}
