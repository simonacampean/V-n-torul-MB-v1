'use client';

import { useState, type FormEvent } from 'react';
import type { TargetModel } from '@/lib/models';
import { updatePrefs } from '@/app/(with-sidebar)/cont/preferinte/actions';

// Grupate tematic (ca în Vânătoare zilnică: piețe majore vs. climat blând
// Mediteranean) în loc de o listă plată de 15 — reduce încărcarea cognitivă
// (Hick's Law) pe o pagină al cărei scop e tocmai „mai puțin zgomot”.
const COUNTRY_GROUPS: { label: string; codes: string[] }[] = [
  { label: 'Europa Centrală & de Vest', codes: ['RO', 'DE', 'AT', 'HU', 'FR', 'NL', 'BE', 'CH', 'PL', 'CZ'] },
  { label: 'Mediterana', codes: ['IT', 'ES', 'PT', 'GR'] },
  { label: 'UK', codes: ['UK'] },
];
const COUNTRIES = COUNTRY_GROUPS.flatMap((g) => g.codes);
/** Cele mai active piețe (mobile.de, Autovit.ro) — implicit sugerate, nu impuse. */
const RECOMMENDED_COUNTRIES = ['RO', 'DE'];

export interface PrefsLite {
  followed_models: string[];
  alert_threshold: number;
  max_budget: number;
  preferred_countries: string[];
  email_alerts: boolean;
}

export default function PreferinteForm({ models, prefs }: { models: TargetModel[]; prefs: PrefsLite }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [countries, setCountries] = useState<string[]>(prefs.preferred_countries);

  function toggleCountry(c: string, checked: boolean) {
    setCountries((cur) => (checked ? [...cur, c] : cur.filter((x) => x !== c)));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const result = await updatePrefs(fd);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setMessage('Preferințele au fost salvate.');
  }

  return (
    <form onSubmit={handleSubmit} className="card flat">
      <div className="seclabel">▸ Modele urmărite (fără nicio bifă = fără alerte)</div>
      <div className="crit" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
        {models.map((m) => (
          <label key={m.code}>
            <input
              type="checkbox"
              name="followed_models"
              value={m.code}
              defaultChecked={prefs.followed_models.includes(m.code)}
            />
            <span>
              {m.code} — {m.name}
            </span>
          </label>
        ))}
      </div>

      <div className="seclabel" style={{ marginTop: 20 }}>
        ▸ Prag de alertă (scor calitate-preț)
      </div>
      <input type="number" name="alert_threshold" min={50} max={100} defaultValue={prefs.alert_threshold} />

      <div className="seclabel" style={{ marginTop: 20 }}>
        ▸ Buget maxim (€)
      </div>
      <input type="number" name="max_budget" min={0} step={500} defaultValue={prefs.max_budget} />

      <div className="seclabel" style={{ marginTop: 20 }}>
        ▸ Țări preferate (fără nicio bifă = toate țările)
      </div>
      <div className="lrow" style={{ marginTop: 0 }}>
        <button type="button" className="btn" onClick={() => setCountries(RECOMMENDED_COUNTRIES)}>
          Selectează recomandate ({RECOMMENDED_COUNTRIES.join(', ')})
        </button>
        <button type="button" className="btn" onClick={() => setCountries(COUNTRIES)}>
          Selectează toate
        </button>
        <button type="button" className="btn" onClick={() => setCountries([])}>
          Curăță
        </button>
      </div>
      {COUNTRY_GROUPS.map((g) => (
        <div key={g.label} style={{ marginTop: 12 }}>
          <div className="meta mono">{g.label}</div>
          <div className="crit" style={{ borderTop: 'none', marginTop: 4, paddingTop: 0 }}>
            {g.codes.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  name="preferred_countries"
                  value={c}
                  checked={countries.includes(c)}
                  onChange={(e) => toggleCountry(c, e.target.checked)}
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <label style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" name="email_alerts" style={{ width: 'auto' }} defaultChecked={prefs.email_alerts} />
        <span>Primesc alerte pe email pentru ofertele care se potrivesc</span>
      </label>

      {error && (
        <p role="alert" style={{ color: '#c0392b', marginTop: 12 }}>
          {error}
        </p>
      )}
      {message && (
        <p style={{ marginTop: 12, color: 'var(--green)' }}>
          {message}
        </p>
      )}

      <div className="btnrow">
        <button type="submit" className="btn dark" disabled={busy}>
          {busy ? 'Se salvează…' : 'Salvează preferințele'}
        </button>
      </div>
    </form>
  );
}
