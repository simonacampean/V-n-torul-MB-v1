'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateBackupCodes, hashBackupCode, looksLikeBackupCode } from '@/lib/auth/backup-codes';
import { logAudit } from '@/lib/audit';

export type MfaActionResult = { error: string } | { ok: true };

/**
 * A-02 — se apelă imediat după ce clientul a confirmat cu succes noul factor
 * TOTP (mfa.challengeAndVerify). Generează 10 coduri de rezervă, le stochează
 * hash-uite și le întoarce o singură dată în clar, pentru afișare.
 */
export async function issueBackupCodes(): Promise<{ codes: string[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const codes = generateBackupCodes();
  const rows = codes.map((code) => ({ user_id: user.id, code_hash: hashBackupCode(code) }));

  const { error: delErr } = await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id);
  if (delErr) return { error: delErr.message };

  const { error: insErr } = await supabase.from('mfa_backup_codes').insert(rows);
  if (insErr) return { error: insErr.message };

  await logAudit('mfa_enroll', { userId: user.id, email: user.email });
  revalidatePath('/cont/securitate');
  return { codes };
}

/** A-02 — dezactivare 2FA: necesită un cod TOTP curent valid, nu doar sesiunea activă. */
export async function disableTotp(factorId: string, code: string): Promise<MfaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (verifyErr) return { error: 'Cod incorect.' };

  const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId });
  if (unenrollErr) return { error: unenrollErr.message };

  await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id);
  await logAudit('mfa_unenroll', { userId: user.id, email: user.email });
  revalidatePath('/cont/securitate');
  return { ok: true };
}

/**
 * Login-time (AAL2): verifică fie un cod TOTP curent, fie un cod de rezervă.
 * Un cod de rezervă valid declanșează recuperarea contului — factorul TOTP
 * pierdut e șters (necesită service role), userul va trebui să reînroleze 2FA.
 */
export async function verifyLoginFactor(factorId: string, code: string): Promise<MfaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat.' };

  if (looksLikeBackupCode(code)) {
    return verifyBackupCodeAndRecover(user.id, code);
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: 'Cod incorect.' };
  await logAudit('login', { userId: user.id, email: user.email, detail: { via: 'totp' } });
  return { ok: true };
}

async function verifyBackupCodeAndRecover(userId: string, code: string): Promise<MfaActionResult> {
  const supabase = await createClient();
  const hash = hashBackupCode(code);

  const { data: rows, error } = await supabase
    .from('mfa_backup_codes')
    .select('id')
    .eq('user_id', userId)
    .eq('code_hash', hash)
    .is('used_at', null)
    .limit(1);

  if (error) return { error: error.message };
  if (!rows?.length) return { error: 'Cod de rezervă invalid sau deja folosit.' };

  const { error: usedErr } = await supabase
    .from('mfa_backup_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', rows[0].id);
  if (usedErr) return { error: usedErr.message };

  const admin = createAdminClient();
  const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId });
  const totp = factors?.factors.find((f) => f.factor_type === 'totp' && f.status === 'verified');
  if (totp) {
    await admin.auth.admin.mfa.deleteFactor({ id: totp.id, userId });
    await logAudit('mfa_unenroll', { userId, detail: { reason: 'backup_code_recovery' } });
  }
  await logAudit('login', { userId, detail: { via: 'backup_code' } });

  // getAuthenticatorAssuranceLevel() (apelat fără jwt, ca în middleware/pagini)
  // citește sesiunea din cache local, nu live — fără refresh, sesiunea curentă
  // tot ar cere aal2 pentru un factor tocmai șters, într-o buclă de redirect.
  await supabase.auth.refreshSession();

  revalidatePath('/cont/securitate');
  return { ok: true };
}
