'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/app/(auth)/actions';

export default function SetNewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await updatePassword(password);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/cont'), 1500);
  }

  if (done) {
    return <p>Parola a fost schimbată. Te redirecționăm către cont…</p>;
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
      <label>
        Parolă nouă (minim 10 caractere)
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={10}
          required
          autoComplete="new-password"
        />
      </label>
      {error && (
        <p role="alert" style={{ color: '#c0392b' }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || password.length < 10}>
        Salvează parola nouă
      </button>
    </form>
  );
}
