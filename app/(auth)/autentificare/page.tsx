import Link from 'next/link';
import { signIn } from '../actions';

export default async function AutentificarePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect_to?: string }>;
}) {
  const { error, redirect_to: redirectTo } = await searchParams;

  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 48, paddingBottom: 48 }}>
      <h1 className="page-title">
        Autentificare
      </h1>

      {error && (
        <p role="alert" style={{ color: '#c0392b', marginTop: 12 }}>
          {error}
        </p>
      )}

      <form action={signIn} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        <input type="hidden" name="redirect_to" value={redirectTo ?? '/cont'} />
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Parolă
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <button type="submit">Autentifică-te</button>
      </form>

      <p className="meta mono" style={{ marginTop: 16 }}>
        Nu ai cont? <Link href="/inregistrare">Creează unul</Link>
      </p>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/reseteaza-parola/cere">Ai uitat parola?</Link>
      </p>
    </main>
  );
}
