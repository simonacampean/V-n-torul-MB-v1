'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importDraft, rejectDraft } from '@/app/(with-sidebar)/admin/oferte/actions';

export default function ModerareDraft({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<'import' | 'reject' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const busy = pendingAction !== null;

  async function handleImport() {
    setPendingAction('import');
    setMessage(null);
    const result = await importDraft(draftId);
    setPendingAction(null);
    if ('error' in result) {
      setIsError(true);
      setMessage(result.error);
      return;
    }
    setIsError(false);
    setMessage(`Importat: ${result.inserted} noi, ${result.updated} actualizate, ${result.skipped} sărite.`);
    router.refresh();
  }

  async function handleReject() {
    setPendingAction('reject');
    setMessage(null);
    const result = await rejectDraft(draftId);
    setPendingAction(null);
    if ('error' in result) {
      setIsError(true);
      setMessage(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="lrow">
        <button type="button" className="btn ok" onClick={handleImport} disabled={busy}>
          {pendingAction === 'import' ? 'Se importă…' : '✓ Importă'}
        </button>
        <button type="button" className="btn del" onClick={handleReject} disabled={busy}>
          {pendingAction === 'reject' ? 'Se respinge…' : 'Respinge'}
        </button>
      </div>
      {message && <div className={`agentmsg ${isError ? 'err' : 'ok'}`}>{message}</div>}
    </div>
  );
}
