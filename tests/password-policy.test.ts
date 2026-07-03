import { describe, it, expect, vi, afterEach } from 'vitest';
import { validatePassword } from '../lib/auth/password-policy';

describe('A-03 — politica de parole', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('respinge parolele sub 10 caractere', async () => {
    const result = await validatePassword('Scurt1!');
    expect(result.ok).toBe(false);
  });

  it('acceptă o parolă suficient de lungă care nu apare în HIBP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => '' })
    );
    const result = await validatePassword('O-Parola-Destul-De-Lunga-9');
    expect(result.ok).toBe(true);
  });

  it('respinge o parolă lungă care apare în HIBP', async () => {
    // Calculăm sufixul SHA-1 real al parolei de test, ca mock-ul HIBP să-l
    // poată „găsi" — reproduce fidel răspunsul real al API-ului.
    const { createHash } = await import('crypto');
    const password = 'Parola-De-Test-Pentru-Hibp-1';
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => `${sha1.slice(5)}:42` })
    );
    const result = await validatePassword(password);
    expect(result.ok).toBe(false);
  });

  it('nu blochează înregistrarea dacă serviciul HIBP e indisponibil', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const result = await validatePassword('O-Alta-Parola-Lunga-8');
    expect(result.ok).toBe(true);
  });
});
