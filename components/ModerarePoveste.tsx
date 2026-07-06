'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { moderateStory } from '@/app/(with-sidebar)/admin/povesti/actions';

export default function ModerarePoveste({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = pendingAction !== null;

  async function handle(decision: 'approved' | 'rejected') {
    setPendingAction(decision);
    setError(null);
    const result = await moderateStory(storyId, decision);
    setPendingAction(null);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="lrow">
      <button type="button" className="btn ok" onClick={() => handle('approved')} disabled={busy}>
        {pendingAction === 'approved' ? 'Se aprobă…' : '✓ Aprobă'}
      </button>
      <button type="button" className="btn del" onClick={() => handle('rejected')} disabled={busy}>
        {pendingAction === 'rejected' ? 'Se respinge…' : 'Respinge'}
      </button>
      {error && (
        <span role="alert" style={{ color: '#c0392b', fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
}
