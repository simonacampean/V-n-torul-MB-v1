'use client';

import { useState } from 'react';
import {
  createCheckoutSession,
  createPortalSession,
  type BillingSessionResult,
} from '@/app/(with-sidebar)/cont/abonament/actions';
import type { BillingPlan } from '@/lib/stripe';

// Navigarea către Stripe se face aici, client-side: redirect() din server
// action nu funcționează către domenii externe (vezi comentariul din actions.ts).
function useBillingNavigation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(action: () => Promise<BillingSessionResult>) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if ('url' in result) {
        window.location.assign(result.url);
        return; // rămâne busy până pleacă pagina
      }
      setError(result.error);
    } catch {
      setError('A apărut o eroare. Încearcă din nou.');
    }
    setBusy(false);
  }

  return { busy, error, go };
}

export function CheckoutButton({ plan, label }: { plan: BillingPlan; label: string }) {
  const { busy, error, go } = useBillingNavigation();
  return (
    <>
      <button type="button" className="btn dark" disabled={busy} onClick={() => go(() => createCheckoutSession(plan))}>
        {busy ? 'Se deschide Stripe…' : label}
      </button>
      {error && (
        <span role="alert" className="mono" style={{ color: 'var(--red)', fontSize: 12, marginLeft: 8 }}>
          {error}
        </span>
      )}
    </>
  );
}

export function PortalButton() {
  const { busy, error, go } = useBillingNavigation();
  return (
    <>
      <button type="button" className="btn" disabled={busy} onClick={() => go(createPortalSession)}>
        {busy ? 'Se deschide Stripe…' : 'Gestionează abonamentul'}
      </button>
      {error && (
        <span role="alert" className="mono" style={{ color: 'var(--red)', fontSize: 12, marginLeft: 8 }}>
          {error}
        </span>
      )}
    </>
  );
}
