import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Verifica2FAForm from '@/components/Verifica2FAForm';
import SetNewPasswordForm from '@/components/SetNewPasswordForm';

export default async function SeteazaParolaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/reseteaza-parola/cere');

  // A-05 — dacă userul are 2FA activ, resetul de parolă NU îl dezactivează:
  // cerem întâi verificarea AAL2, nu ocolim 2FA doar pentru că a venit prin
  // linkul de recuperare din email.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsMfa = Boolean(aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2');

  let totpFactorId: string | null = null;
  if (needsMfa) {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    totpFactorId = factorsData?.totp?.find((f) => f.status === 'verified')?.id ?? null;
  }

  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 48, paddingBottom: 48 }}>
      <h1 className="page-title">
        Setează o parolă nouă
      </h1>

      {needsMfa && totpFactorId ? (
        <>
          <p style={{ marginTop: 12 }}>
            Contul tău are 2FA activ — confirmă codul înainte de a schimba parola.
          </p>
          <Verifica2FAForm factorId={totpFactorId} redirectTo="/reseteaza-parola/seteaza" />
        </>
      ) : (
        <SetNewPasswordForm />
      )}
    </main>
  );
}
