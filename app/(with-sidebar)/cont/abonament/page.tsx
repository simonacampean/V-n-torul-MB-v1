import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CheckoutButton, PortalButton } from '@/components/AbonamentActions';
import { getStripe, priceIdForPlan, type BillingPlan } from '@/lib/stripe';
import { trackEvent } from '@/lib/track';

/** P2/claritate — prețul trebuie vizibil înainte de a intra în checkout-ul Stripe, nu doar acolo. */
async function loadPrices(): Promise<Partial<Record<BillingPlan, string>>> {
  try {
    const stripe = getStripe();
    const [monthly, yearly] = await Promise.all([
      stripe.prices.retrieve(priceIdForPlan('monthly')),
      stripe.prices.retrieve(priceIdForPlan('yearly')),
    ]);
    const fmt = (p: typeof monthly) =>
      p.unit_amount != null
        ? `${(p.unit_amount / 100).toLocaleString('ro-RO', { maximumFractionDigits: 2 })} ${p.currency.toUpperCase()}`
        : undefined;
    const result: Partial<Record<BillingPlan, string>> = {};
    const m = fmt(monthly);
    const y = fmt(yearly);
    if (m) result.monthly = m;
    if (y) result.yearly = y;
    return result;
  } catch {
    return {}; // Stripe neconfigurat — butoanele rămân fără preț afișat, nu blochează pagina.
  }
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activ',
  trialing: 'Perioadă de probă',
  past_due: 'Plată restantă',
  canceled: 'Anulat',
  incomplete: 'Neîncheiat',
  incomplete_expired: 'Expirat înainte de a începe',
  unpaid: 'Neplătit',
};

export default async function AbonamentPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const { checkout, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/abonament');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont/abonament');
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  const isActive = sub?.status === 'active' || sub?.status === 'trialing';
  const prices = isActive ? {} : await loadPrices();
  if (checkout === 'success') await trackEvent('checkout_success');
  if (checkout === 'cancel') await trackEvent('checkout_cancel');

  return (
    <div>
      <h1 className="page-title">Abonament</h1>

      {checkout === 'success' && (
        <div className="agentmsg ok" style={{ marginTop: 12 }}>
          Plata a fost procesată. Statusul abonamentului se actualizează în câteva secunde.
        </div>
      )}
      {checkout === 'cancel' && (
        <div className="agentmsg err" style={{ marginTop: 12 }}>
          Ai anulat procesul de plată — niciun abonament nu a fost creat.
        </div>
      )}
      {error && (
        <p role="alert" style={{ color: '#c0392b', marginTop: 12 }}>
          {error}
        </p>
      )}

      <div className="card flat" style={{ marginTop: 20 }}>
        <div className="seclabel">▸ Statusul curent</div>
        {sub ? (
          <p>
            Plan <b>{sub.plan === 'yearly' ? 'anual' : 'lunar'}</b> — status{' '}
            <b>{STATUS_LABEL[sub.status] ?? sub.status}</b>
            {sub.current_period_end && (
              <>
                {' '}
                · reînnoire la {new Date(sub.current_period_end).toLocaleDateString('ro-RO')}
              </>
            )}
          </p>
        ) : (
          <p>Nu ai încă un abonament premium.</p>
        )}
        {isActive && (
          <div className="btnrow">
            <PortalButton />
          </div>
        )}
      </div>

      {!isActive && (
        <div className="card flat" style={{ marginTop: 16 }}>
          <div className="seclabel">▸ Premium: alerte instant, agent zilnic personalizat, istoric extins</div>
          <div className="btnrow">
            <CheckoutButton
              plan="monthly"
              label={prices.monthly ? `Abonează-te lunar — ${prices.monthly}/lună` : 'Abonează-te lunar'}
            />
            <CheckoutButton
              plan="yearly"
              label={prices.yearly ? `Abonează-te anual — ${prices.yearly}/an` : 'Abonează-te anual'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
