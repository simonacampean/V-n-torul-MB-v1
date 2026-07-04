'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/auth/password-policy';
import { logAudit } from '@/lib/audit';

const emailSchema = z.string().email('Adresă de email invalidă.');

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  // GDPR-01 — ToS/Politica de confidențialitate: consimțământ obligatoriu.
  // Marketing: consimțământ SEPARAT și opțional (alertele de produs nu sunt
  // marketing — sunt legitime prin contract, deci nu depind de această bifă).
  const tosAccepted = formData.get('tos_accepted') === 'on';
  const marketingConsent = formData.get('marketing_consent') === 'on';

  const emailCheck = emailSchema.safeParse(email);
  if (!emailCheck.success) {
    redirect(`/inregistrare?error=${encodeURIComponent(emailCheck.error.issues[0].message)}`);
  }

  const passwordCheck = await validatePassword(password);
  if (!passwordCheck.ok) {
    redirect(`/inregistrare?error=${encodeURIComponent(passwordCheck.message)}`);
  }

  if (!tosAccepted) {
    redirect(`/inregistrare?error=${encodeURIComponent('Trebuie să accepți Termenii și Politica de confidențialitate.')}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      data: { tos_accepted: true, marketing_consent: marketingConsent },
    },
  });

  if (error) {
    redirect(`/inregistrare?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/verifica-email');
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect_to') ?? '/cont');

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/autentificare?error=${encodeURIComponent('Email sau parolă incorectă.')}`);
  }

  // A-02 — parola singură nu ajunge dacă userul are 2FA activ.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect(`/verifica-2fa?redirect_to=${encodeURIComponent(redirectTo)}`);
  }

  // SEC-04 — login complet fără al doilea factor (userul nu are 2FA activ);
  // cazul cu 2FA se loghează la finalul verificării, în verifyLoginFactor.
  await logAudit('login', { userId: signInData.user?.id, email: signInData.user?.email });

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  // scope: 'global' — deconectează toate dispozitivele (A-04).
  await supabase.auth.signOut({ scope: 'global' });
  revalidatePath('/', 'layout');
  redirect('/');
}

// A-05 — recuperare cont. Mesaj generic indiferent dacă emailul există, ca
// să nu confirmăm/infirmăm existența unui cont (anti-enumerare).
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const emailCheck = emailSchema.safeParse(email);
  if (emailCheck.success) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent('/reseteaza-parola/seteaza')}`,
    });
  }
  redirect('/reseteaza-parola/verifica-email');
}

export type UpdatePasswordResult = { error: string } | { ok: true };

/**
 * A-05 — setarea parolei noi după recuperare. NU atinge factorii 2FA — dacă
 * userul are 2FA activ, verificarea AAL2 se face separat, înainte de acest pas
 * (vezi app/reseteaza-parola/seteaza/page.tsx), nu prin dezactivarea lui.
 */
export async function updatePassword(password: string): Promise<UpdatePasswordResult> {
  const passwordCheck = await validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesiune de recuperare invalidă sau expirată.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  await logAudit('password_change', { userId: user.id, email: user.email });
  return { ok: true };
}
