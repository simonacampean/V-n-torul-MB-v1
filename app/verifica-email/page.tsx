import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function VerificaEmailPage() {
  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 48, paddingBottom: 48 }}>
      <h1 className="page-title">
        Verifică-ți emailul
      </h1>
      <p style={{ marginTop: 12 }}>
        Ți-am trimis un link de confirmare. Deschide-l pentru a-ți activa contul, apoi
        autentifică-te.
      </p>
    </main>
  );
}
