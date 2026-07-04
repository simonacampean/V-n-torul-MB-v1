import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { logAudit } from '@/lib/audit';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const GRACE_DAYS = 30;

/**
 * GDPR-02 — rulat de Vercel Cron (vercel.json), o dată pe zi. Finalizează
 * cererile de ștergere cont a căror perioadă de grație (30 zile) a expirat:
 * anulează abonamentul Stripe activ (dacă există), apoi șterge userul din
 * Supabase Auth — cascadează prin toate tabelele cu user_id (profiles,
 * watchlist_items, user_prefs, notifications, subscriptions, mfa_backup_codes),
 * iar offers.submitted_by se pune pe null (migrarea 0011) în loc să blocheze
 * ștergerea.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - GRACE_DAYS);

  const { data: due } = await admin
    .from('profiles')
    .select('user_id, deletion_requested_at')
    .not('deletion_requested_at', 'is', null)
    .lte('deletion_requested_at', threshold.toISOString());

  let anonymized = 0;
  const errors: string[] = [];

  for (const row of due ?? []) {
    try {
      const { data: sub } = await admin
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('user_id', row.user_id)
        .maybeSingle();

      if (sub?.stripe_subscription_id && (sub.status === 'active' || sub.status === 'trialing')) {
        await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
      }

      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
      const email = authUser?.user?.email ?? null;

      const { error: delErr } = await admin.auth.admin.deleteUser(row.user_id);
      if (delErr) {
        errors.push(`${row.user_id}: ${delErr.message}`);
        continue;
      }

      await logAudit('admin_action', { email, detail: { action: 'account_anonymized', requestedAt: row.deletion_requested_at } });
      anonymized++;
    } catch (e) {
      errors.push(`${row.user_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, anonymized, due: (due ?? []).length, ...(errors.length ? { errors } : {}) });
}
