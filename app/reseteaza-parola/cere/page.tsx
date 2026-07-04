import Link from 'next/link';
import type { Metadata } from 'next';
import { requestPasswordReset } from '../../(auth)/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CereResetareParolaPage() {
  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 48, paddingBottom: 48 }}>
      <h1 className="page-title">
        Ai uitat parola?
      </h1>
      <p style={{ marginTop: 12 }}>
        Introdu adresa de email a contului — dacă există, primești un link de resetare.
      </p>

      <form action={requestPasswordReset} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <button type="submit">Trimite linkul de resetare</button>
      </form>

      <p className="meta mono" style={{ marginTop: 16 }}>
        <Link href="/autentificare">← Înapoi la autentificare</Link>
      </p>
    </main>
  );
}
