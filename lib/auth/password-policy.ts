// A-03 — politica de parole. Doar server-side (foloseşte crypto + apel extern HIBP).
import { z } from 'zod';
import { createHash } from 'crypto';

export const passwordSchema = z
  .string()
  .min(10, 'Parola trebuie să aibă cel puțin 10 caractere.');

/**
 * Verifică parola în baza „Have I Been Pwned" prin k-anonymity: se trimite
 * doar primele 5 caractere din hash-ul SHA-1, niciodată parola sau hash-ul complet.
 */
export async function isPasswordCompromised(password: string): Promise<boolean> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split('\n').some((line) => line.split(':')[0].trim() === suffix);
  } catch {
    // Serviciul extern indisponibil → nu blocăm înregistrarea pe acest criteriu;
    // lungimea minimă (mai sus) rămâne oricum obligatorie.
    return false;
  }
}

export type PasswordCheck = { ok: true } | { ok: false; message: string };

export async function validatePassword(password: string): Promise<PasswordCheck> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }
  if (await isPasswordCompromised(password)) {
    return {
      ok: false,
      message: 'Această parolă a apărut în breșe de securitate publice cunoscute. Alege alta.',
    };
  }
  return { ok: true };
}
