'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleCampaign, deleteCampaign } from '@/app/(with-sidebar)/admin/publicitate/actions';

export default function PublicitateActions({ campaignId, active }: { campaignId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(action: () => Promise<{ error: string } | { ok: true }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="lrow">
      <button type="button" className="btn" onClick={() => handle(() => toggleCampaign(campaignId, !active))} disabled={busy}>
        {active ? 'Dezactivează' : 'Activează'}
      </button>
      <button
        type="button"
        className="btn del"
        onClick={() => {
          if (confirm('Ștergi definitiv această campanie?')) handle(() => deleteCampaign(campaignId));
        }}
        disabled={busy}
      >
        Șterge
      </button>
      {error && (
        <span role="alert" style={{ color: '#c0392b', fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
}
