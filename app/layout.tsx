import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import SiteHeader from '@/components/SiteHeader';
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

export const metadata: Metadata = {
  title: 'Vânătorul MB — Investiții Mercedes clasice',
  description:
    'Platformă pentru pasionații de Mercedes-Benz clasice: modele-țintă, căutare în toată Europa, evaluator de prețuri pe grade de stare și alerte de chilipiruri.',
  applicationName: 'Vânătorul MB',
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
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
