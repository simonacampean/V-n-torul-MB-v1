'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { exportBackup, importBackup, type ImportResult } from '@/app/cont/date/actions';

export default function DateMele() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    const result = await exportBackup();
    setBusy(false);
    if ('error' in result) {
      setMessage(`Eroare la export: ${result.error}`);
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vanatorul-mb-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setMessage(null);
    setErrors([]);
    const text = await file.text();
    const result: ImportResult = await importBackup(text);
    setBusy(false);

    if ('error' in result) {
      setMessage(`Import eșuat: ${result.error}`);
      return;
    }
    setMessage(
      `Import reușit: ${result.imported} anunțuri adăugate` +
        (result.skipped ? `, ${result.skipped} sărite (deja existau, după link)` : '') +
        '.'
    );
    setErrors(result.errors);
    router.refresh();
  }

  return (
    <div className="card flat">
      <div className="seclabel">▸ Export / import backup</div>
      <p style={{ fontSize: 14, color: 'var(--inksoft)' }}>
        Exportă toate anunțurile din Lista mea într-un fișier JSON (portabilitate GDPR). Poți reimporta
        același fișier — sau un backup vechi exportat din aplicația v5 — oricând; anunțurile se adaugă la
        lista existentă, fără duplicate după link.
      </p>
      <div className="btnrow">
        <button type="button" className="btn dark" onClick={handleExport} disabled={busy}>
          ⭳ Exportă datele mele
        </button>
        <button type="button" className="btn" onClick={handleImportClick} disabled={busy}>
          ⭱ Importă backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      {message && <p style={{ marginTop: 10, fontSize: 14 }}>{message}</p>}
      {errors.length > 0 && (
        <ul className="ghid" style={{ marginTop: 8 }}>
          {errors.map((e, i) => (
            <li key={i} style={{ color: 'var(--red)' }}>
              {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
