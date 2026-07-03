import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Verifica2FAForm from '@/components/Verifica2FAForm';

export default async function Verifica2FAPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_to?: string }>;
}) {
  const { redirect_to: redirectTo } = await searchParams;
  const target = redirectTo ?? '/cont';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/autentificare?redirect_to=${encodeURIComponent(target)}`);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal || aal.nextLevel !== 'aal2' || aal.currentLevel === 'aal2') {
    redirect(target);
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totp = factorsData?.totp?.find((f) => f.status === 'verified');
  if (!totp) redirect(target);

  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 48, paddingBottom: 48 }}>
      <h1 className="page-title">
        Verificare în doi pași
      </h1>
      <p style={{ marginTop: 12 }}>
        Contul tău are 2FA activ. Introdu codul din aplicația de autentificare pentru a continua.
      </p>
      <Verifica2FAForm factorId={totp.id} redirectTo={target} />
    </main>
  );
}
