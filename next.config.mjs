import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */

// SEC-01 — CSP. Fără nonce-uri (ar cere infrastructură de middleware pentru
// injectare per-request pe fiecare <Script>) — 'unsafe-inline' e un compromis
// pragmatic, documentat în docs/M5-status.md. object-src/base-uri/form-action
// restrictive + frame-ancestors 'none' rămân protecții reale, fără compromis.
// În dev, Next.js are nevoie de 'unsafe-eval' pentru Fast Refresh (webpack).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.gstatic.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseUrl} https://*.supabase.co wss://*.supabase.co https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.sentry.io https://*.ingest.sentry.io`,
  `frame-src https://*.googlesyndication.com https://*.doubleclick.net`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

// Monitorizare erori (M5) — withSentryConfig e sigur de aplicat necondiționat:
// fără SENTRY_AUTH_TOKEN, plugin-ul doar sare peste upload-ul de source maps
// (avertisment, nu eroare de build); fără DSN, SDK-ul e no-op la runtime
// (vezi sentry.*.config.ts).
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  webpack: { removeDebugLogging: true, automaticVercelMonitors: false },
});
