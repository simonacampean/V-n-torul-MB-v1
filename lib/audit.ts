import { createAdminClient } from '@/lib/supabase/admin';

export type AuditAction =
  | 'login'
  | 'mfa_enroll'
  | 'mfa_unenroll'
  | 'password_change'
  | 'account_delete_requested'
  | 'admin_action';

/**
 * SEC-04 — jurnal de audit pentru evenimente de securitate. Scrie DOAR prin
 * clientul admin (RLS pe audit_log nu are politică de INSERT pentru nimeni
 * altcineva). Eșecul de logare nu trebuie să blocheze acțiunea reală a
 * userului — se înghite eroarea, nu se propagă.
 */
export async function logAudit(
  action: AuditAction,
  params: { userId?: string | null; email?: string | null; detail?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('audit_log').insert({
      user_id: params.userId ?? null,
      actor_email: params.email ?? null,
      action,
      detail: params.detail ?? {},
    });
  } catch {
    // intenționat: logarea de audit nu trebuie să blocheze fluxul real
  }
}
