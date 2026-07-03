import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/** Client Stripe — instanțiat o singură dată, doar server-side. */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY lipsește din variabilele de mediu.');
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export type BillingPlan = 'monthly' | 'yearly';

export function priceIdForPlan(plan: BillingPlan): string {
  const id = plan === 'monthly' ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_YEARLY;
  if (!id) throw new Error(`Prețul Stripe pentru planul „${plan}" nu e configurat.`);
  return id;
}
