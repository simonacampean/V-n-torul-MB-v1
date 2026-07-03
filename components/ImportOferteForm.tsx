'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importOffersReport } from '@/app/(with-sidebar)/cont/oferte/actions';

export default function ImportOferteForm() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleImport() {
    setBusy(true);
    setMessage(null);
    const result = await importOffersReport(text);
    setBusy(false);
    if ('error' in result) {
      setIsError(true);
      setMessage(result.error);
      return;
    }
    setIsError(false);
    setMessage(
      `Import reușit: ${result.inserted} oferte noi, ${result.updated} actualizate` +
        (result.skipped ? `, ${result.skipped} sărite (invalide)` : '') +
        '.'
    );
    setText('');
    router.refresh();
  }

  return (
    <div className="card flat agent-import">
      <div className="seclabel">▸ Importă raportul agentului</div>
      <p style={{ fontSize: 14, color: 'var(--inksoft)' }}>
        Lipește raportul zilnic (conține blocul <code>{'{"offers":[...]}'}</code>) — poți lipi text liber în jurul lui,
        îl extragem automat. Reimportarea aceluiași raport nu creează duplicate.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Lipește aici raportul zilnic (conține blocul {"offers":[...]})'
      />
      <div className="btnrow">
        <button type="button" className="btn dark" onClick={handleImport} disabled={busy || !text.trim()}>
          ⭳ Importă raportul
        </button>
      </div>
      {message && (
        <div className={`agentmsg ${isError ? 'err' : 'ok'}`}>{message}</div>
      )}
    </div>
  );
}
