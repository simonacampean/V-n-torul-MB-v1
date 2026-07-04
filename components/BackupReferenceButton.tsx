'use client';

import { useState } from 'react';
import { exportReferenceBackup } from '@/app/(with-sidebar)/admin/backup-actions';

export default function BackupReferenceButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    const result = await exportReferenceBackup();
    setBusy(false);
    if ('error' in result) {
      setMessage(`Eroare: ${result.error}`);
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vanatorul-mb-backup-referinta-${result.data.exported.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage('Descărcat.');
  }

  return (
    <div className="btnrow" style={{ alignItems: 'center' }}>
      <button type="button" className="btn dark" onClick={handleExport} disabled={busy}>
        ⭳ Exportă backup date de referință
      </button>
      {message && <span style={{ fontSize: 13, color: 'var(--inksoft)' }}>{message}</span>}
    </div>
  );
}
