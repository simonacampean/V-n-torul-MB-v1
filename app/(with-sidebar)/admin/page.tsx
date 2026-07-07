import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, priceIdForPlan } from '@/lib/stripe';
import { estimateMrr } from '@/lib/dashboard';
import { fmt } from '@/lib/models';
import BackupReferenceButton from '@/components/BackupReferenceButton';

async function loadRevenue(monthlyActive: number, yearlyActive: number): Promise<number | null> {
  try {
    const stripe = getStripe();
    const [monthlyPrice, yearlyPrice] = await Promise.all([
      stripe.prices.retrieve(priceIdForPlan('monthly')),
      stripe.prices.retrieve(priceIdForPlan('yearly')),
    ]);
    return estimateMrr({
      monthlyActive,
      yearlyActive,
      monthlyPriceCents: monthlyPrice.unit_amount ?? 0,
      yearlyPriceCents: yearlyPrice.unit_amount ?? 0,
    });
  } catch {
    return null; // Stripe neconfigurat sau indisponibil — secțiunea de venit devine „—”, nu blochează restul dashboard-ului.
  }
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/admin');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { count: totalUsers },
    { count: premiumUsers },
    { count: adminUsers },
    { data: recentLogins },
    { count: activeOffers },
    { count: pendingOffers },
    { count: excellentOffers },
    { count: notificationsTotal },
    { count: notifications30d },
    { data: subs },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'premium'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('audit_log').select('user_id').eq('action', 'login').gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('moderation', 'approved'),
    supabase.from('offers').select('*', { count: 'exact', head: true }).eq('moderation', 'pending'),
    supabase.from('offers').select('*', { count: 'exact', head: true }).eq('excellent', true).eq('status', 'active'),
    admin.from('notifications').select('*', { count: 'exact', head: true }),
    admin.from('notifications').select('*', { count: 'exact', head: true }).gte('sent_at', thirtyDaysAgo.toISOString()),
    admin.from('subscriptions').select('plan,status').in('status', ['active', 'trialing']),
  ]);

  const activeUsers30d = new Set((recentLogins ?? []).map((r) => r.user_id)).size;
  const monthlyActive = (subs ?? []).filter((s) => s.plan === 'monthly').length;
  const yearlyActive = (subs ?? []).filter((s) => s.plan === 'yearly').length;
  const revenue = await loadRevenue(monthlyActive, yearlyActive);

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Dashboard admin (AD-04)</h1>

      <div className="grid3" style={{ marginTop: 20 }}>
        <div className="card flat">
          <div className="seclabel">▸ Utilizatori</div>
          <div className="score">{fmt(totalUsers ?? 0)}</div>
          <div className="meta mono" style={{ marginTop: 6 }}>
            {fmt(activeUsers30d)} activi (autentificați) în ultimele 30 de zile · {fmt(premiumUsers ?? 0)} premium · {fmt(adminUsers ?? 0)} admin
          </div>
        </div>

        <div className="card flat" style={{ borderLeft: '3px solid var(--green)' }}>
          <div className="seclabel">▸ Anunțuri active</div>
          <div className="score">{fmt(activeOffers ?? 0)}</div>
          <div className="meta mono" style={{ marginTop: 6 }}>
            {fmt(excellentOffers ?? 0)} excelente · {fmt(pendingOffers ?? 0)} în așteptare moderare
          </div>
        </div>

        <div className="card flat">
          <div className="seclabel">▸ Alerte trimise</div>
          <div className="score">{fmt(notificationsTotal ?? 0)}</div>
          <div className="meta mono" style={{ marginTop: 6 }}>{fmt(notifications30d ?? 0)} în ultimele 30 de zile</div>
        </div>

        <div className="card flat" style={{ borderLeft: '3px solid var(--red)' }}>
          <div className="seclabel">▸ Venit lunar estimat</div>
          <div className="score" style={{ color: 'var(--red)' }}>{revenue != null ? `${fmt(revenue)} €` : '—'}</div>
          <div className="meta mono" style={{ marginTop: 6 }}>
            {fmt(monthlyActive)} abonamente lunare · {fmt(yearlyActive)} anuale (amortizate/lună)
          </div>
        </div>
      </div>

      <div className="note" style={{ marginTop: 8 }}>
        „Utilizatori activi” = utilizatori distincți cu cel puțin un login înregistrat în jurnalul de audit
        (SEC-04) în ultimele 30 de zile. Venitul e o estimare (MRR) din abonamentele Stripe active/trial,
        la prețurile curente — nu include comisioane sau taxe.
      </div>

      <div className="seclabel" style={{ marginTop: 28 }}>▸ Backup bază de date</div>
      <div className="card flat">
        <p style={{ fontSize: 14, color: 'var(--inksoft)' }}>
          Proiectul Supabase rulează pe planul <b>Free</b>, care nu include backup automat gestionat
          (disponibil doar din planul Pro — 25 $/lună, cu 7 zile retenție; PITR ca add-on separat).
          Până la upgrade, poți exporta oricând un instantaneu al datelor de referință (modele țintă,
          platforme, costuri transport, pagini de conținut, campanii publicitare) — nu conține date
          personale de utilizatori (acelea au propriul export GDPR-02 din contul fiecărui utilizator).
        </p>
        <div style={{ marginTop: 12 }}>
          <BackupReferenceButton />
        </div>
      </div>
    </main>
  );
}
