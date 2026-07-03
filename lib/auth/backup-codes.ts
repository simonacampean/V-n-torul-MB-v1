// A-02 — coduri de rezervă 2FA. Supabase MFA (TOTP) nu are așa ceva nativ;
// le generăm și le stocăm noi, hash-uite (sha-256), niciodată în clar.
import { randomBytes, createHash } from 'crypto';

// Fără 0/O și 1/I — ambigue la citit/tastat manual.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomCode(): string {
  const bytes = randomBytes(8);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, randomCode);
}

/** Normalizează formatul introdus de utilizator (spații, minuscule, liniuță opțională). */
export function normalizeBackupCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashBackupCode(code: string): string {
  return createHash('sha256').update(normalizeBackupCode(code)).digest('hex');
}

export function looksLikeBackupCode(input: string): boolean {
  return normalizeBackupCode(input).length === 8;
}
