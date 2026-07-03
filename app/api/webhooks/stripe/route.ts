import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

async function syncSubscription(admin: ReturnType<typeof createAdminClient>, subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const item = subscription.items.data[0];
  const plan = item?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly';
  const currentPeriodEnd = item ? new Date(item.current_period_end * 1000).toISOString() : null;

  await admin
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      current_period_end: currentPeriodEnd,
    })
    .eq('user_id', userId);

  // A-06 — rolul premium reflectă starea reală a abonamentului Stripe.
  // Nu retrogradăm niciodată un admin la 'user' pe această cale.
  const isPremiumNow = subscription.status === 'active' || subscription.status === 'trialing';
  await admin
    .from('profiles')
    .update({ role: isPremiumNow ? 'premium' : 'user' })
    .eq('user_id', userId)
    .neq('role', 'admin');
}

/** S-03/M4 — sincronizează planul/statusul din Stripe cu subscriptions + profiles.role. */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: 'Configurație lipsă.' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: 'Semnătură invalidă.' }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === 'string') {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncSubscription(admin, subscription);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await syncSubscription(admin, event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
