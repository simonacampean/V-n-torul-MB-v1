'use client';

import { useEffect, useState } from 'react';
import {
  CONSENT_COOKIE,
  CONSENT_EVENT,
  CONSENT_MAX_AGE_SECONDS,
  DEFAULT_CONSENT,
  GRANTED_CONSENT,
  parseConsentCookie,
  type ConsentState,
} from '@/lib/consent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function readConsentCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeConsent(value: 'granted' | 'denied', state: ConsentState) {
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
  window.gtag?.('consent', 'update', state);
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** GDPR-03 — banner CMP: fără alegere explicită, nimic nu se activează (implicit „denied"). */
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raw = readConsentCookie();
    const decided = parseConsentCookie(raw);
    // Scriptul static din <head> pornește mereu din „denied" (fără citire de
    // cookie server-side, ca să nu forțeze randare dinamică pe tot site-ul).
    // Dacă vizitatorul decisese deja, reconciliem imediat starea reală.
    if (decided) window.gtag?.('consent', 'update', decided);
    setVisible(raw === null);
  }, []);

  if (!visible) return null;

  return (
    <div className="cookiebar" role="dialog" aria-label="Consimțământ cookie-uri">
      <p>
        Folosim cookie-uri esențiale pentru funcționarea site-ului. Cu acordul tău, folosim și
        cookie-uri de publicitate/măsurare (Consent Mode v2) — poți schimba oricând alegerea.
      </p>
      <div className="btnrow">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            writeConsent('granted', GRANTED_CONSENT);
            setVisible(false);
          }}
        >
          Accept tot
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            writeConsent('denied', DEFAULT_CONSENT);
            setVisible(false);
          }}
        >
          Doar esențiale
        </button>
      </div>
    </div>
  );
}
