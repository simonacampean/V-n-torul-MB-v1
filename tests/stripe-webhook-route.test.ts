// Testează direct handler-ul POST /api/webhooks/stripe cu evenimente semnate
// criptografic real (generateTestHeaderString din SDK) — fără server HTTP și
// fără să depindă de Stripe CLI. Verifică pe DB-ul real: sincronizarea
// subscriptions + comutarea profiles.role premium↔user (migrarea 0008 permite
// service_role să treacă de trigger-ul protect_role_change).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { POST } from '../app/api/webhooks/stripe/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const canRun = Boolean(url && serviceKey && webhookSecret);

function subscriptionEvent(type: string, userId: string, status: string, interval: 'month' | 'year') {
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
  return JSON.stringify({
    id: 'evt_test_vmb',
    object: 'event',
    type,
    data: {
      object: {
        id: 'sub_test_vmb',
        object: 'subscription',
        status,
        metadata: { user_id: userId },
        items: {
          data: [
            {
              id: 'si_test_vmb',
              current_period_end: periodEnd,
              price: { id: 'price_test', recurring: { interval } },
            },
          ],
        },
      },
    },
  });
}

function signedRequest(payload: string, secret: string) {
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: payload,
  });
}

describe.runIf(canRun)('POST /api/webhooks/stripe — sincronizare abonament (M4)', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  let userId: string;

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: `test-stripe-${Date.now()}@example.com`,
      password: 'Parola-Lunga-De-Test-123!',
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    // rândul subscriptions e creat în mod normal la createCheckoutSession
    await admin.from('subscriptions').upsert({ user_id: userId, stripe_customer_id: 'cus_test_vmb' }, { onConflict: 'user_id' });
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it('respinge un payload cu semnătură invalidă', async () => {
    const req = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=semnatura-falsa' },
      body: subscriptionEvent('customer.subscription.updated', userId, 'active', 'month'),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('abonament activ ⇒ subscriptions sincronizat + rol premium', async () => {
    const res = await POST(signedRequest(subscriptionEvent('customer.subscription.updated', userId, 'active', 'month'), webhookSecret!));
    expect(res.status).toBe(200);

    const { data: sub } = await admin.from('subscriptions').select('plan,status,stripe_subscription_id,current_period_end').eq('user_id', userId).single();
    expect(sub?.status).toBe('active');
    expect(sub?.plan).toBe('monthly');
    expect(sub?.stripe_subscription_id).toBe('sub_test_vmb');
    expect(sub?.current_period_end).toBeTruthy();

    const { data: profile } = await admin.from('profiles').select('role').eq('user_id', userId).single();
    expect(profile?.role).toBe('premium');
  });

  it('anulare (customer.subscription.deleted) ⇒ rolul revine la user', async () => {
    const res = await POST(signedRequest(subscriptionEvent('customer.subscription.deleted', userId, 'canceled', 'year'), webhookSecret!));
    expect(res.status).toBe(200);

    const { data: sub } = await admin.from('subscriptions').select('plan,status').eq('user_id', userId).single();
    expect(sub?.status).toBe('canceled');
    expect(sub?.plan).toBe('yearly');

    const { data: profile } = await admin.from('profiles').select('role').eq('user_id', userId).single();
    expect(profile?.role).toBe('user');
  });
});
