'use client';

import { useState } from 'react';

/** Baza legală e obligatorie doar pentru conectoare api/afiliere (regulă de
 * business existentă doar în copy până acum) — aici devine o validare reală,
 * nu doar text descriptiv ignorabil. */
export default function ConnectorTypeField({ defaultValue = 'manual' }: { defaultValue?: string }) {
  const [type, setType] = useState(defaultValue);
  const needsLegal = type === 'api' || type === 'affiliate';

  return (
    <>
      <div>
        <label htmlFor="connector_type">Tip conector</label>
        <select id="connector_type" name="connector_type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="manual">Manual (import asistat)</option>
          <option value="native">Nativ (anunțuri proprii)</option>
          <option value="api">API</option>
          <option value="affiliate">Afiliere</option>
        </select>
      </div>
      <div>
        <label htmlFor="legal_basis">Bază legală {needsLegal ? '(obligatoriu pt. API/afiliere)' : '(opțional)'}</label>
        <input
          id="legal_basis"
          name="legal_basis"
          required={needsLegal}
          placeholder="ex.: acord de parteneriat semnat 2026-01"
        />
      </div>
    </>
  );
}
