'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  requestAccountDeletion,
  cancelAccountDeletion,
  type DeletionStatus,
} from '@/app/(with-sidebar)/cont/date/actions';

/** GDPR-02 — ștergere cont self-service, cu 30 de zile de grație anulabile. */
export default function ContDeletion({ status }: { status: DeletionStatus }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (status.requestedAt) {
    const deleteOn = status.deleteOnIso ? new Date(status.deleteOnIso).toLocaleDateString('ro-RO') : '—';

    async function handleCancel() {
      setBusy(true);
      setMessage(null);
      const result = await cancelAccountDeletion();
      setBusy(false);
      if ('error' in result) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    }

    return (
      <div className="card flat" style={{ borderLeftColor: 'var(--red)' }}>
        <div className="seclabel" style={{ color: 'var(--red)' }}>▸ Cont programat pentru ștergere</div>
        <p style={{ fontSize: 14, color: 'var(--inksoft)' }}>
          Contul tău va fi șters definitiv pe <b>{deleteOn}</b> (30 de zile de la cerere). Până atunci
          poți anula oricând — datele rămân neschimbate.
        </p>
        <div className="btnrow">
          <button type="button" className="btn dark" onClick={handleCancel} disabled={busy}>
            Anulează ștergerea
          </button>
        </div>
        {message && <p style={{ marginTop: 10, fontSize: 14, color: 'var(--red)' }}>{message}</p>}
      </div>
    );
  }

  async function handleSubmit() {
    setBusy(true);
    setMessage(null);
    const result = await requestAccountDeletion(password);
    setBusy(false);
    if ('error' in result) {
      setMessage(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card flat" style={{ borderLeftColor: 'var(--red)' }}>
      <div className="seclabel" style={{ color: 'var(--red)' }}>▸ Șterge contul</div>
      <p style={{ fontSize: 14, color: 'var(--inksoft)' }}>
        Datele tale personale se anonimizează la 30 de zile de la cerere; poți anula oricând în acest
        interval. Detalii în <a href="/confidentialitate">Politica de confidențialitate</a>.
      </p>
      <label>
        Confirmă parola
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10 }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{ width: 'auto', marginTop: 4 }}
        />
        <span>Înțeleg că această acțiune programează ștergerea definitivă a contului meu.</span>
      </label>
      <div className="btnrow">
        <button type="button" className="btn del" onClick={handleSubmit} disabled={busy || !confirmed || !password}>
          Șterge contul
        </button>
      </div>
      {message && <p style={{ marginTop: 10, fontSize: 14, color: 'var(--red)' }}>{message}</p>}
    </div>
  );
}
