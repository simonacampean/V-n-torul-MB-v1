import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { offerTotal } from '@/lib/scoring';
import {
  isEligibleForAlert, pickAlertReason, priceDropPercent,
  alreadySentDigestToday, alreadyNotifiedForOffer, isPremiumActive,
} from '@/lib/notifications';
import { renderDigestEmailHtml, renderDigestEmailText, type AlertOfferItem } from '@/lib/email/alert-template';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * S-02/S-03/S-04 — rulat de Vercel Cron (vercel.json), o dată pe zi (planul
 * Hobby Vercel nu permite cron mai frecvent; scorurile tot se recalculează
 * orar prin pg_cron — S-01 — doar dispecerizarea emailurilor e zilnică).
 * Găsește ofertele care merită o alertă (excelentă sau scădere de preț ≥10%)
 * și trimite email prin Resend — un digest zilnic la planul gratuit, instant
 * per-ofertă la premium (pregătit pentru M4, necesită plan Vercel Pro pt.
 * cron mai frecvent dacă se dorește „instant" cu adevărat).
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || !provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

  const { data: offers } = await admin
    .from('offers')
    .select('id,model_code,title,price,country,score,excellent,options,history_verified,url')
    .eq('status', 'active')
    .eq('moderation', 'approved');

  if (!offers?.length) {
    return NextResponse.json({ ok: true, emailsSent: 0, note: 'nicio ofertă activă' });
  }

  const offerIds = offers.map((o) => o.id);
  const { data: histories } = await admin
    .from('offer_price_history')
    .select('offer_id, price, seen_at')
    .in('offer_id', offerIds)
    .order('seen_at', { ascending: true });

  const firstPriceByOffer = new Map<string, number>();
  (histories ?? []).forEach((h) => {
    if (!firstPriceByOffer.has(h.offer_id)) firstPriceByOffer.set(h.offer_id, h.price);
  });

  const { data: allPrefs } = await admin
    .from('user_prefs')
    .select('user_id, followed_models, alert_threshold, max_budget, preferred_countries, email_alerts, unsubscribe_token')
    .eq('email_alerts', true);

  if (!allPrefs?.length) {
    return NextResponse.json({ ok: true, emailsSent: 0, note: 'niciun user cu alerte active' });
  }

  const { data: existingNotifications } = await admin
    .from('notifications')
    .select('user_id, offer_id, type, sent_at')
    .eq('channel', 'email');

  const notifByUser = new Map<string, { offer_id: string; type: string; sent_at: string }[]>();
  (existingNotifications ?? []).forEach((n) => {
    const arr = notifByUser.get(n.user_id) ?? [];
    arr.push(n);
    notifByUser.set(n.user_id, arr);
  });

  const { data: subs } = await admin.from('subscriptions').select('user_id, status');
  const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const notificationsToInsert: { user_id: string; offer_id: string; type: string; channel: string }[] = [];
  const sendErrors: string[] = [];
  let emailsSent = 0;

  interface AlertItemWithId extends AlertOfferItem {
    offerId: string;
  }

  for (const prefs of allPrefs) {
    const userNotifs = notifByUser.get(prefs.user_id) ?? [];
    const premium = isPremiumActive(subByUser.get(prefs.user_id));

    if (!premium && alreadySentDigestToday(userNotifs.map((n) => n.sent_at))) {
      continue; // S-04 — planul gratuit: maximum 1 digest/zi
    }

    const items: AlertItemWithId[] = [];
    for (const offer of offers) {
      if (!isEligibleForAlert(prefs, offer)) continue;

      const firstPrice = firstPriceByOffer.get(offer.id) ?? offer.price;
      const dropPct = priceDropPercent(offer.price, firstPrice);
      const reason = pickAlertReason(prefs, offer, dropPct);
      if (!reason) continue;
      if (alreadyNotifiedForOffer(userNotifs, offer.id, reason)) continue;

      items.push({
        offerId: offer.id,
        offerTitle: offer.title,
        modelCode: offer.model_code,
        score: offer.score,
        price: offer.price,
        totalRo: offerTotal(offer.price, offer.country),
        offerUrl: offer.url,
        reason,
        dropPct: reason === 'price_drop' ? dropPct : undefined,
        fullOptions: offer.options === 'full',
        historyVerified: offer.history_verified,
      });
    }

    if (!items.length) continue;

    // premium: un email instant per ofertă · gratuit: un singur digest cu toate ofertele calificate
    const batches = premium ? items.map((item) => [item]) : [items];

    const { data: userData } = await admin.auth.admin.getUserById(prefs.user_id);
    const email = userData?.user?.email;
    if (!email) continue;

    const unsubscribeUrl = `${siteUrl}/dezaboneaza?token=${prefs.unsubscribe_token}`;

    for (const batch of batches) {
      const html = renderDigestEmailHtml(batch, unsubscribeUrl);
      const text = renderDigestEmailText(batch, unsubscribeUrl);
      const subject = batch.length > 1 ? `${batch.length} oferte noi de urmărit` : batch[0].offerTitle;

      if (!resend) {
        sendErrors.push('RESEND_API_KEY lipsește — email netrimis.');
        continue;
      }

      const { error: sendError } = await resend.emails.send({
        from: 'Vânătorul MB <onboarding@resend.dev>',
        to: email,
        subject,
        html,
        text,
      });
      if (sendError) {
        sendErrors.push(`${email}: ${sendError.message}`);
        continue; // nu marcăm ca trimis dacă Resend a respins efectiv emailul — se reîncearcă la rularea următoare
      }
      emailsSent++;
      batch.forEach((item) => {
        notificationsToInsert.push({ user_id: prefs.user_id, offer_id: item.offerId, type: item.reason, channel: 'email' });
      });
    }
  }

  if (notificationsToInsert.length) {
    await admin.from('notifications').insert(notificationsToInsert);
  }

  return NextResponse.json({
    ok: true,
    emailsSent,
    offersConsidered: offers.length,
    usersChecked: allPrefs.length,
    ...(sendErrors.length ? { sendErrors } : {}),
  });
}
