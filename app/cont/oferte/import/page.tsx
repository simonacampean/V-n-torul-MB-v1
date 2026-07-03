import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ImportOferteForm from '@/components/ImportOferteForm';

export default async function ImportOfertePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/oferte/import');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont/oferte/import');
  }

  return (
    <div>
      <h1 className="page-title">Importă raportul agentului</h1>
      <p style={{ marginTop: 12 }}>
        Sarcina zilnică „Vânătoarea MB&rdquo; din Claude generează raportul cu top oferte + blocul JSON. Lipește-l aici —
        ofertele apar imediat pe <a href="/oferte">Top oferte</a>.
      </p>
      <div style={{ marginTop: 20 }}>
        <ImportOferteForm />
      </div>
    </div>
  );
}
