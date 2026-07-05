import { track } from '@vercel/analytics/server';

/**
 * Metrici de produs (Error Rate/Drop-off din auditul UX) — semnalele existau
 * deja ca returnuri `{ error }` din server actions, dar nu ajungeau nicăieri
 * observabil (nu sunt excepții, deci Sentry nu le vede). Eșecul de trimitere
 * nu trebuie să blocheze acțiunea reală a userului — se înghite eroarea.
 */
export async function trackEvent(name: string, properties?: Record<string, string | number | boolean>): Promise<void> {
  try {
    await track(name, properties);
  } catch {
    // intenționat: instrumentarea nu trebuie să blocheze fluxul real
  }
}
