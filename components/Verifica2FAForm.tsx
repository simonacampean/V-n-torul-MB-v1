'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { verifyLoginFactor } from '@/app/(auth)/mfa-actions';

type Props = {
  factorId: string;
  redirectTo: string;
};

export default function Verifica2FAForm({ factorId, redirectTo }: Props) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await verifyLoginFactor(factorId, code);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
      <label>
        Cod din aplicația authenticator (6 cifre) sau cod de rezervă (XXXX-XXXX)
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoComplete="one-time-code"
        />
      </label>
      {error && (
        <p role="alert" style={{ color: '#c0392b' }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || code.trim().length < 6}>
        Verifică
      </button>
    </form>
  );
}
