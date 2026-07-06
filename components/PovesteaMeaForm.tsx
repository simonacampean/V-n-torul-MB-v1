'use client';

import { useState } from 'react';
import type { TargetModel } from '@/lib/models';
import { submitSuccessStory } from '@/app/(with-sidebar)/cont/povestea-mea/actions';

export default function PovesteaMeaForm({ models }: { models: TargetModel[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitSuccessStory(fd);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setMessage('Mulțumim! Povestea ta a fost trimisă spre moderare.');
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
        <input
          name="an_fabricatie"
          placeholder="An fabricație (opțional)"
          inputMode="numeric"
          pattern="19[5-9][0-9]|20[0-2][0-9]"
          maxLength={4}
          title="An între 1950 și 2029."
        />
        <input
          name="pret_achizitie"
          placeholder="Preț de achiziție (€)"
          inputMode="numeric"
          pattern="[0-9]{3,7}"
          title="Doar cifre, fără puncte sau spații (ex: 8500)."
          required
        />
        <input
          name="pret_mediu_piata_atunci"
          placeholder="Preț mediu de piață atunci (opțional, €)"
          inputMode="numeric"
          pattern="[0-9]{3,7}"
          title="Doar cifre, fără puncte sau spații — dacă știi cât costau altele similare atunci."
        />
        <input
          name="nume_afisat"
          placeholder="Nume/oraș afișat public (opțional, ex: Alin din Cluj)"
          maxLength={80}
          style={{ gridColumn: '1/-1' }}
        />
        <textarea
          name="text_poveste"
          placeholder="Povestește pe scurt: ce te-a ajutat platforma să afli sau să eviți, cum a decurs achiziția..."
          minLength={20}
          maxLength={2000}
          required
          rows={5}
          style={{ gridColumn: '1/-1' }}
        />
      </div>
      <p className="disclaimer mono" style={{ marginTop: 4 }}>
        Dacă lași numele gol, povestea apare public ca „Un cumpărător Vânătorul MB&rdquo;. Orice text scris aici la
        „nume/oraș&rdquo; va fi vizibil public, dacă povestea e aprobată.
      </p>
      {error && (
        <p role="alert" style={{ color: '#c0392b', marginTop: 8 }}>
          {error}
        </p>
      )}
      {message && <p style={{ marginTop: 8, color: 'var(--green)' }}>{message}</p>}
      <div className="btnrow">
        <button type="submit" className="btn dark" disabled={busy}>
          {busy ? 'Se trimite…' : '+ Trimite povestea'}
        </button>
      </div>
    </form>
  );
}
