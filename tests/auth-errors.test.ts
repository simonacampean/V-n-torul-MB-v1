import { describe, it, expect } from 'vitest';
import { authErrorMessage } from '../lib/auth-errors';

describe('authErrorMessage', () => {
  it('otp_expired ⇒ mesaj specific cu invitație de retrimitere', () => {
    expect(authErrorMessage('otp_expired')).toMatch(/expirat/);
  });

  it('cod necunoscut ⇒ mesaj generic, nu eroarea brută', () => {
    expect(authErrorMessage('something_weird')).toMatch(/invalid sau a expirat/);
  });

  it('fără cod ⇒ mesaj generic', () => {
    expect(authErrorMessage(null)).toMatch(/invalid sau a expirat/);
  });
});
