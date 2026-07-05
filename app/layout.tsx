import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ConsentDefaultScript from '@/components/ConsentDefaultScript';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import AdSenseLoader from '@/components/AdSenseLoader';
import AuthErrorHandler from '@/components/AuthErrorHandler';
import './globals.css';

/* Fonturile Datenkarte prin next/font: self-hosted la build, zero blocaj de
   randare (corecția Lighthouse M0 — nu înlocui cu @import de Google Fonts). */
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const TITLE = 'Vânătorul MB — Investiții Mercedes clasice';
const DESCRIPTION =
  'Platformă pentru pasionații de Mercedes-Benz clasice: modele-țintă, căutare în toată Europa, evaluator de prețuri pe grade de stare și alerte de chilipiruri.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Vânătorul MB',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Vânătorul MB',
    locale: 'ro_RO',
    type: 'website',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
};

export const viewport: Viewport = {
  themeColor: '#22262B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <ConsentDefaultScript />
        <AuthErrorHandler />
        <SiteHeader />
        {children}
        <SiteFooter />
        <CookieConsentBanner />
        <AdSenseLoader />
        {/* Analytics Vercel: cookieless/anonim (nu cade sub consimțământul de
            publicitate GDPR-03) — măsoară trafic + Web Vitals reale. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
