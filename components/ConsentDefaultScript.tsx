import Script from 'next/script';
import { DEFAULT_CONSENT } from '@/lib/consent';

/**
 * GDPR-03 — trebuie să ruleze înaintea oricărui script de tracking/publicitate,
 * de aceea strategy="beforeInteractive". Pornim mereu din „denied" static (nu
 * citim cookie-ul aici — ar forța randare dinamică pe tot site-ul via
 * next/headers::cookies()); dacă vizitatorul decisese deja, CookieConsentBanner
 * reconciliază starea reală imediat după montare, înainte ca vreun script real
 * de tracking să apuce să pornească.
 */
export default function ConsentDefaultScript() {
  return (
    <Script id="consent-mode-default" strategy="beforeInteractive">
      {`window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('consent','default',${JSON.stringify(DEFAULT_CONSENT)});`}
    </Script>
  );
}
