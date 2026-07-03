'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { CONSENT_COOKIE, CONSENT_EVENT } from '@/lib/consent';

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

function hasGrantedConsent(): boolean {
  return document.cookie.includes(`${CONSENT_COOKIE}=granted`);
}

/** GDPR-03 — scriptul AdSense pornește doar după consimțământ explicit; fără el, sloturile rămân placeholder. */
export default function AdSenseLoader() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    setGranted(hasGrantedConsent());
    const onChange = () => setGranted(hasGrantedConsent());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!ADSENSE_CLIENT || !granted) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
