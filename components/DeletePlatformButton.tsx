'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deletePlatform } from '@/app/(with-sidebar)/admin/platforme/actions';

export default function DeletePlatformButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!confirm(`Ștergi definitiv platforma „${name}”?`)) return;
    setBusy(true);
    setError(null);
    const result = await deletePlatform(id);
    if ('error' in result) {
      setBusy(false);
      setError(result.error);
      return;
    }
    router.push('/admin/platforme');
  }

  return (
    <div className="lrow">
      <button type="button" className="btn del" onClick={handle} disabled={busy}>
        Șterge platforma
      </button>
      {error && (
        <span role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
}
