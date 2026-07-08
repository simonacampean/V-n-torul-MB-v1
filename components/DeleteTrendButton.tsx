'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTrend } from '@/app/(with-sidebar)/admin/tendinte/actions';

export default function DeleteTrendButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!confirm(`Ștergi definitiv valoarea „${label}”?`)) return;
    setBusy(true);
    setError(null);
    const result = await deleteTrend(id);
    if ('error' in result) {
      setBusy(false);
      setError(result.error);
      return;
    }
    router.push('/admin/tendinte');
  }

  return (
    <div className="lrow">
      <button type="button" className="btn del" onClick={handle} disabled={busy}>
        Șterge valoarea
      </button>
      {error && (
        <span role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
}
