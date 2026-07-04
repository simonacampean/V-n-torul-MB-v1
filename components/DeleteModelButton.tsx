'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteModel } from '@/app/(with-sidebar)/admin/modele/actions';

export default function DeleteModelButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!confirm(`Ștergi definitiv modelul ${code}?`)) return;
    setBusy(true);
    setError(null);
    const result = await deleteModel(code);
    if ('error' in result) {
      setBusy(false);
      setError(result.error);
      return;
    }
    router.push('/admin/modele');
  }

  return (
    <div className="lrow">
      <button type="button" className="btn del" onClick={handle} disabled={busy}>
        Șterge modelul
      </button>
      {error && (
        <span role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
}
