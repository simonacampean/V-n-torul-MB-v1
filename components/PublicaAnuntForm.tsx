'use client';

import { useState } from 'react';
import type { TargetModel } from '@/lib/models';
import { condOf } from '@/lib/scoring';
import { submitNativeOffer } from '@/app/(with-sidebar)/cont/oferte/actions';

export default function PublicaAnuntForm({ models }: { models: TargetModel[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitNativeOffer(fd);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setMessage('Anunțul a fost trimis spre moderare. Va apărea public după aprobare.');
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="card flat">
      <div className="formgrid">
        <select name="model_code" defaultValue={models[0]?.code}>
          {models.map((m) => (
            <option key={m.code} value={m.code}>
              {m.code} — {m.name}
            </option>
          ))}
        </select>
        <select name="cond" defaultValue="2">
          {['1', '2', '3', '4'].map((id) => (
            <option key={id} value={id}>
              Stare {condOf(id).label}
            </option>
          ))}
        </select>
        <input name="title" placeholder="Titlu (ex: 300CE-24, Almandinrot, 138.000 km)" required minLength={3} title="Minim 3 caractere." />
        <input
          name="price"
          placeholder="Preț (€)"
          inputMode="numeric"
          pattern="[0-9]{3,7}"
          title="Doar cifre, fără puncte sau spații (ex: 12000)."
          required
        />
        <input name="url" placeholder="Link anunț (opțional)" type="url" title="Adresă completă, ex: https://..." />
        <input
          name="year"
          placeholder="An fabricație"
          inputMode="numeric"
          pattern="19[5-9][0-9]|20[0-2][0-9]"
          maxLength={4}
          title="An între 1950 și 2029."
        />
        <input name="km" placeholder="Kilometraj" inputMode="numeric" pattern="[0-9]{1,7}" title="Doar cifre." />
        <select name="options" defaultValue="standard">
          <option value="full">Full options</option>
          <option value="partial">Dotări parțiale</option>
          <option value="standard">Standard</option>
        </select>
        <input
          name="country"
          placeholder="Țară (ex: RO, DE)"
          defaultValue="RO"
          required
          maxLength={2}
          pattern="[A-Za-z]{2}"
          title="Cod de țară din 2 litere, ex: RO, DE."
          style={{ textTransform: 'uppercase' }}
        />
        <input name="note" placeholder="Note" style={{ gridColumn: '1/-1' }} />
      </div>
      {error && (
        <p role="alert" style={{ color: '#c0392b', marginTop: 8 }}>
          {error}
        </p>
      )}
      {message && <p style={{ marginTop: 8, color: 'var(--green)' }}>{message}</p>}
      <div className="btnrow">
        <button type="submit" className="btn dark" disabled={busy}>
          {busy ? 'Se trimite…' : '+ Publică anunțul'}
        </button>
      </div>
    </form>
  );
}
