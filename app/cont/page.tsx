import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../(auth)/actions';

export default async function ContPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/autentificare?redirect_to=/cont');
  }

  // A-02 — un login cu parolă nu e suficient dacă userul are 2FA activ;
  // fără asta, vizitarea directă a /cont ar ocoli verificarea AAL2.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont');
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1 className="page-title">Contul meu</h1>
      <p style={{ marginTop: 12 }}>Autentificat ca {user.email}.</p>
      <form action={signOut} style={{ marginTop: 20 }}>
        <button type="submit">Deconectează toate dispozitivele</button>
      </form>
    </div>
  );
}
