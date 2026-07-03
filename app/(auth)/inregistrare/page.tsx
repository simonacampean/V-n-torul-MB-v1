import Link from 'next/link';
import { signUp } from '../actions';

export default async function InregistrarePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 48, paddingBottom: 48 }}>
      <h1 className="page-title">
        Creează cont
      </h1>

      {error && (
        <p role="alert" style={{ color: '#c0392b', marginTop: 12 }}>
          {error}
        </p>
      )}

      <form action={signUp} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Parolă (minim 10 caractere)
          <input type="password" name="password" required minLength={10} autoComplete="new-password" />
        </label>
        <button type="submit">Creează cont</button>
      </form>

      <p className="meta mono" style={{ marginTop: 16 }}>
        Ai deja cont? <Link href="/autentificare">Autentifică-te</Link>
      </p>
    </main>
  );
}
