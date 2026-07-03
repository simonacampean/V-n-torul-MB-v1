import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTargetModels } from '@/lib/models';
import PreferinteForm from '@/components/PreferinteForm';

export default async function PreferintePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/preferinte');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont/preferinte');
  }

  const [{ models }, { data: prefs }] = await Promise.all([
    getTargetModels(),
    supabase
      .from('user_prefs')
      .select('followed_models,alert_threshold,max_budget,preferred_countries,email_alerts')
      .eq('user_id', user.id)
      .single(),
  ]);

  return (
    <div>
      <h1 className="page-title">Preferințe & alerte</h1>
      <p style={{ marginTop: 12 }}>
        Primești un email zilnic (digest) cu ofertele care se potrivesc criteriilor tale — cel mult unul pe zi.
      </p>
      <div style={{ marginTop: 20 }}>
        <PreferinteForm
          models={models}
          prefs={{
            followed_models: prefs?.followed_models ?? [],
            alert_threshold: prefs?.alert_threshold ?? 85,
            max_budget: prefs?.max_budget ?? 20000,
            preferred_countries: prefs?.preferred_countries ?? [],
            email_alerts: prefs?.email_alerts ?? true,
          }}
        />
      </div>
    </div>
  );
}
