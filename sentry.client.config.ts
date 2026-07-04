import * as Sentry from '@sentry/nextjs';

// Monitorizare erori (M5) — fără DSN configurat, init() e un no-op sigur
// (SDK-ul Sentry nu trimite nimic, nu aruncă erori). Vezi .env.example.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});
