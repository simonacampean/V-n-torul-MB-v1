'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, priceIdForPlan, type BillingPlan } from '@/lib/stripe';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';
}

export type BillingSessionResult = { url: string } | { error: string };

/**
 * Creează sesiunea Stripe Checkout (Customer nou dacă e primul abonament).
 * Întoarce URL-ul, NU apelează redirect(): redirect() dintr-un server action
 * nu poate naviga către un domeniu extern (fetch-ul intern e blocat de CORS
 * și pagina rămâne pe loc, fără nicio eroare vizibilă) — clientul face
 * window.location.assign(url). Bug găsit la testul live al beneficiarului.
 */
export async function createCheckoutSession(plan: BillingPlan): Promise<BillingSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/abonament');

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const stripe = getStripe();
  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
    await admin
      .from('subscriptions')
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: 'user_id' });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
    success_url: `${siteUrl()}/cont/abonament?checkout=success`,
    cancel_url: `${siteUrl()}/cont/abonament?checkout=cancel`,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  });

  if (!session.url) return { error: 'Stripe nu a întors un URL de checkout.' };
  return { url: session.url };
}

/** Deschide Customer Portal — de acolo userul își poate anula/schimba abonamentul. */
export async function createPortalSession(): Promise<BillingSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/abonament');

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return { error: 'Nu ai încă un abonament activ.' };
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${siteUrl()}/cont/abonament`,
  });
  return { url: session.url };
}
