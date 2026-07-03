'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importDraft, rejectDraft } from '@/app/admin/oferte/actions';

export default function ModerareDraft({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleImport() {
    setBusy(true);
    setMessage(null);
    const result = await importDraft(draftId);
    setBusy(false);
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
    setBusy(true);
    setMessage(null);
    const result = await rejectDraft(draftId);
    setBusy(false);
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
          ✓ Importă
        </button>
        <button type="button" className="btn del" onClick={handleReject} disabled={busy}>
          Respinge
        </button>
      </div>
      {message && <div className={`agentmsg ${isError ? 'err' : 'ok'}`}>{message}</div>}
    </div>
  );
}
