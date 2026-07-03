'use client';

import { useState } from 'react';
import { createCheckoutSession, createPortalSession } from '@/app/(with-sidebar)/cont/abonament/actions';
import type { BillingPlan } from '@/lib/stripe';

export function CheckoutButton({ plan, label }: { plan: BillingPlan; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn dark"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        createCheckoutSession(plan);
      }}
    >
      {label}
    </button>
  );
}

export function PortalButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        createPortalSession();
      }}
    >
      Gestionează abonamentul
    </button>
  );
}
