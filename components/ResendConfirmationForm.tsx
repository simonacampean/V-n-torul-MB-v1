'use client';

import { useState } from 'react';
import { resendConfirmationEmail } from '@/app/(auth)/actions';

export default function ResendConfirmationForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await resendConfirmationEmail(email);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="agentmsg ok" style={{ marginTop: 12 }}>
        Dacă adresa are un cont neconfirmat, un link nou a fost trimis.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12, display: 'grid', gap: 10 }}>
      <label>
        Retrimite linkul de confirmare
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      {error && (
        <p role="alert" style={{ color: '#c0392b' }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {busy ? 'Se trimite…' : 'Trimite linkul din nou'}
      </button>
    </form>
  );
}
