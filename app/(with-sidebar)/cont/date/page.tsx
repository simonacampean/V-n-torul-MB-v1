import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DateMele from '@/components/DateMele';
import ContDeletion from '@/components/ContDeletion';
import { getDeletionStatus } from './actions';

export default async function DatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/date');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont/date');
  }

  const deletionStatus = await getDeletionStatus();

  return (
    <div>
      <h1 className="page-title">Datele mele</h1>
      <DateMele />
      <ContDeletion status={deletionStatus} />
    </div>
  );
}
