// GDPR-03 — Consent Mode v2: implicit refuzat până la acceptul explicit al
// vizitatorului; niciun script de tracking/publicitate nu pornește înainte.

export const CONSENT_COOKIE = 'vmb_consent';
export const CONSENT_EVENT = 'vmb-consent-changed';
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 zile

export type ConsentValue = 'granted' | 'denied';

export interface ConsentState {
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
  analytics_storage: ConsentValue;
}

export const DEFAULT_CONSENT: ConsentState = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};

export const GRANTED_CONSENT: ConsentState = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
};

/** Interpretează valoarea cookie-ului de consimțământ; orice altceva ⇒ nedecis (null). */
export function parseConsentCookie(raw: string | undefined | null): ConsentState | null {
  if (raw === 'granted') return GRANTED_CONSENT;
  if (raw === 'denied') return DEFAULT_CONSENT;
  return null;
}
