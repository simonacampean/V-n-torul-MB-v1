import { describe, it, expect } from 'vitest';
import { parseConsentCookie, DEFAULT_CONSENT, GRANTED_CONSENT } from '../lib/consent';

describe('parseConsentCookie — GDPR-03 Consent Mode v2', () => {
  it('„granted" ⇒ toate categoriile permise', () => {
    expect(parseConsentCookie('granted')).toEqual(GRANTED_CONSENT);
  });

  it('„denied" ⇒ toate categoriile refuzate (default)', () => {
    expect(parseConsentCookie('denied')).toEqual(DEFAULT_CONSENT);
  });

  it('nedecis (undefined/null/valoare necunoscută) ⇒ null, nu presupune consimțământ', () => {
    expect(parseConsentCookie(undefined)).toBeNull();
    expect(parseConsentCookie(null)).toBeNull();
    expect(parseConsentCookie('altceva')).toBeNull();
  });
});
