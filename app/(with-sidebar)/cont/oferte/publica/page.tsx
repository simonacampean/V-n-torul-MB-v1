import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTargetModels } from '@/lib/models';
import PublicaAnuntForm from '@/components/PublicaAnuntForm';

export default async function PublicaAnuntPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/oferte/publica');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont/oferte/publica');
  }

  const { models } = await getTargetModels();

  return (
    <div>
      <h1 className="page-title">Publică un anunț</h1>
      <p style={{ marginTop: 12 }}>
        Vinzi o mașină clasică? Publică anunțul gratuit — intră în moderare și apare public după aprobare.
      </p>
      <div style={{ marginTop: 20 }}>
        <PublicaAnuntForm models={models} />
      </div>
    </div>
  );
}
