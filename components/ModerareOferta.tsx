'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { moderateOffer } from '@/app/(with-sidebar)/admin/oferte/actions';

export default function ModerareOferta({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(decision: 'approved' | 'rejected') {
    setBusy(true);
    setError(null);
    const result = await moderateOffer(offerId, decision);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="lrow">
      <button type="button" className="btn ok" onClick={() => handle('approved')} disabled={busy}>
        ✓ Aprobă
      </button>
      <button type="button" className="btn del" onClick={() => handle('rejected')} disabled={busy}>
        Respinge
      </button>
      {error && (
        <span role="alert" style={{ color: '#c0392b', fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
}
