import { createAdminClient } from '@/lib/supabase/admin';

/**
 * S-04 — dezabonare cu un click, direct din linkul din email, fără login
 * (cerință legală). Efectul se produce chiar la randarea acestei pagini —
 * exact comportamentul „un click" cerut, fără un pas de confirmare separat.
 */
export default async function DezaboneazaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="wrap" style={{ maxWidth: 420, paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Link invalid</h1>
        <p style={{ marginTop: 12 }}>Lipsește token-ul de dezabonare din link.</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_prefs')
    .update({ email_alerts: false })
    .eq('unsubscribe_token', token)
    .select('user_id')
    .single();

  const success = !error && Boolean(data);

  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 48, paddingBottom: 48 }}>
      <h1 className="page-title">{success ? 'Dezabonat' : 'Link invalid sau expirat'}</h1>
      <p style={{ marginTop: 12 }}>
        {success
          ? 'Nu vei mai primi alerte de oferte pe email. Îți poți reactiva oricând alertele din Preferințe & alerte, din cont.'
          : 'Nu am găsit un abonament asociat acestui link.'}
      </p>
    </main>
  );
}
