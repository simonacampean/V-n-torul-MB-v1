'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { recalculeazaFairValue } from '@/app/(with-sidebar)/admin/oferte/actions';

export default function RecalculeazaFairValueButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setBusy(true);
    setError(null);
    const result = await recalculeazaFairValue(offerId);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <span className="lrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button type="button" className="btn" onClick={handle} disabled={busy}>
        {busy ? 'Se recalculează…' : '↻ Recalculează Fair-Value'}
      </button>
      {error && (
        <span role="alert" style={{ color: '#c0392b', fontSize: 12 }}>
          {error}
        </span>
      )}
    </span>
  );
}
