import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TotpPanel from '@/components/TotpPanel';

export default async function SecuritatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/securitate');

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified') ?? null;

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 className="page-title">Securitate cont</h1>
      <p style={{ marginTop: 12 }}>Autentificare în doi pași (2FA TOTP)</p>

      <div style={{ marginTop: 20 }}>
        <TotpPanel initialFactorId={verifiedTotp?.id ?? null} />
      </div>
    </div>
  );
}
