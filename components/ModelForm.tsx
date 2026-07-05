'use client';

import { useRef, useState } from 'react';
import SubmitButton from '@/components/SubmitButton';

export interface ModelFormInitial {
  code?: string;
  name?: string;
  years?: string;
  body?: string;
  year_from?: number;
  year_to?: number;
  band_lo?: number;
  band_hi?: number;
  thesis?: string;
  checklist?: string;
  tags?: string;
  verdict?: string;
  gallery_query?: string;
  hunt_query?: string;
  prod_note?: string;
  active?: boolean;
}

type Props = {
  mode: 'create' | 'edit';
  action: (formData: FormData) => void | Promise<void>;
  initial?: ModelFormInitial;
  submitLabel: string;
};

/**
 * Formular de 2 pași (Identitate & perioadă → Preț & conținut) în loc de 16
 * câmpuri într-un singur ecran (Hick's Law). Câmpurile rămân toate montate în
 * DOM (doar ascunse vizual), ca formData să le conțină pe toate la submit —
 * validarea zod din server action rămâne sursa de adevăr, aici adăugăm doar
 * un prim filtru client-side ca eroarea să nu apară abia după round-trip.
 */
export default function ModelForm({ mode, action, initial, submitLabel }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const step1Ref = useRef<HTMLFieldSetElement>(null);

  function goToStep2() {
    const fs = step1Ref.current;
    if (!fs) return;
    const yearFrom = fs.querySelector<HTMLInputElement>('[name=year_from]');
    const yearTo = fs.querySelector<HTMLInputElement>('[name=year_to]');
    if (yearFrom && yearTo && yearFrom.value && yearTo.value && Number(yearFrom.value) > Number(yearTo.value)) {
      yearTo.setCustomValidity('Anul de sfârșit trebuie să fie ≥ anul de început.');
    } else {
      yearTo?.setCustomValidity('');
    }
    if (!fs.reportValidity()) return;
    setStep(2);
  }

  return (
    <form action={action} className="card" style={{ marginTop: 16 }}>
      <div className="lrow" style={{ marginTop: 0, marginBottom: 16 }}>
        <span className={`status ${step === 1 ? 'todo' : 'done'}`}>
          Pasul 1/2 — Identitate & perioadă
        </span>
        <span className={`status ${step === 2 ? 'todo' : 'done'}`}>
          Pasul 2/2 — Preț & conținut
        </span>
      </div>

      <fieldset
        ref={step1Ref}
        className="formgrid"
        style={{ display: step === 1 ? 'grid' : 'none', border: 'none', padding: 0 }}
      >
        {mode === 'create' && (
          <div>
            <label htmlFor="code">Cod (ex.: W124)</label>
            <input id="code" name="code" required />
          </div>
        )}
        <div>
          <label htmlFor="name">Nume complet</label>
          <input id="name" name="name" defaultValue={initial?.name} required />
        </div>
        <div>
          <label htmlFor="years">Perioadă (ex.: 1984–1997)</label>
          <input id="years" name="years" defaultValue={initial?.years} required />
        </div>
        <div>
          <label htmlFor="body">Caroserie</label>
          <select id="body" name="body" defaultValue={initial?.body ?? 'sedan'}>
            <option value="sedan">Sedan</option>
            <option value="coupe">Coupé</option>
            <option value="roadster">Roadster</option>
          </select>
        </div>
        <div>
          <label htmlFor="year_from">An început</label>
          <input id="year_from" name="year_from" type="number" defaultValue={initial?.year_from} required />
        </div>
        <div>
          <label htmlFor="year_to">An sfârșit</label>
          <input id="year_to" name="year_to" type="number" defaultValue={initial?.year_to} required />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} style={{ width: 'auto' }} />
          <span>Activ (vizibil public)</span>
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="button" className="btn dark" onClick={goToStep2}>
            Continuă →
          </button>
        </div>
      </fieldset>

      <fieldset
        className="formgrid"
        style={{ display: step === 2 ? 'grid' : 'none', border: 'none', padding: 0 }}
      >
        <div>
          <label htmlFor="band_lo">Bandă preț — minim (€)</label>
          <input id="band_lo" name="band_lo" type="number" defaultValue={initial?.band_lo} required />
        </div>
        <div>
          <label htmlFor="band_hi">Bandă preț — maxim (€)</label>
          <input id="band_hi" name="band_hi" type="number" defaultValue={initial?.band_hi} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="thesis">Teza de investiție</label>
          <textarea id="thesis" name="thesis" rows={3} defaultValue={initial?.thesis} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="checklist">Checklist inspecție (câte un punct pe linie)</label>
          <textarea id="checklist" name="checklist" rows={4} defaultValue={initial?.checklist} />
        </div>
        <div>
          <label htmlFor="tags">Etichete (separate prin virgulă)</label>
          <input id="tags" name="tags" defaultValue={initial?.tags} />
        </div>
        <div>
          <label htmlFor="gallery_query">Interogare galerie foto</label>
          <input id="gallery_query" name="gallery_query" defaultValue={initial?.gallery_query} required />
        </div>
        <div>
          <label htmlFor="hunt_query">Interogare căutare (F-02, ex.: „SL R129”)</label>
          <input id="hunt_query" name="hunt_query" defaultValue={initial?.hunt_query} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="verdict">Verdict</label>
          <input id="verdict" name="verdict" defaultValue={initial?.verdict} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="prod_note">Notă producție (opțional)</label>
          <input id="prod_note" name="prod_note" defaultValue={initial?.prod_note} />
        </div>
        <div style={{ gridColumn: '1 / -1' }} className="btnrow">
          <button type="button" className="btn" onClick={() => setStep(1)}>
            ← Înapoi
          </button>
          <SubmitButton pendingLabel="Se salvează…">{submitLabel}</SubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
