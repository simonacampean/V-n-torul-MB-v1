// S-02/S-04/S-05 — logică pură (fără efecte) pentru determinarea eligibilității
// la alertă și a regulilor anti-spam. Ușor de testat izolat de DB/Resend.

export interface UserPrefsLite {
  followed_models: string[];
  alert_threshold: number;
  max_budget: number;
  preferred_countries: string[];
  email_alerts: boolean;
}

export interface OfferForAlert {
  model_code: string;
  price: number;
  country: string;
  score: number;
}

/**
 * S-05 — filtrul de „audiență": userul poate primi alerte pentru această
 * ofertă doar dacă are alertele email active, urmărește explicit modelul
 * (fără modele urmărite = fără alerte — opt-in, nu spam implicit), oferta se
 * încadrează în buget și (dacă a filtrat) în țările preferate. NU verifică
 * scorul aici — pragul de scor se aplică doar declanșatorului „excelentă"
 * (vezi pickAlertReason), nu și celui de scădere de preț (S-02: cele două
 * sunt condiții independente, unite prin „SAU" în caiet).
 */
export function isEligibleForAlert(prefs: UserPrefsLite, offer: OfferForAlert): boolean {
  if (!prefs.email_alerts) return false;
  if (!prefs.followed_models.length) return false;
  if (!prefs.followed_models.includes(offer.model_code)) return false;
  if (offer.price > prefs.max_budget) return false;
  if (prefs.preferred_countries.length && !prefs.preferred_countries.includes(offer.country)) return false;
  return true;
}

/** S-02 — scădere de preț ≥10% (rotunjit, procent pozitiv). */
export function priceDropPercent(currentPrice: number, firstPrice: number): number {
  if (firstPrice <= 0 || currentPrice >= firstPrice) return 0;
  return Math.round((1 - currentPrice / firstPrice) * 100);
}

/**
 * S-02 — decide DE CE (dacă deloc) userul ar trebui alertat pentru această
 * ofertă: scor peste pragul lui personal ⇒ „excellent"; altfel scădere de
 * preț ≥10% ⇒ „price_drop"; altfel null (nu se alertează).
 */
export function pickAlertReason(
  prefs: Pick<UserPrefsLite, 'alert_threshold'>,
  offer: Pick<OfferForAlert, 'score'> & { excellent: boolean },
  dropPct: number
): 'excellent' | 'price_drop' | null {
  if (offer.excellent && offer.score >= prefs.alert_threshold) return 'excellent';
  if (dropPct >= 10) return 'price_drop';
  return null;
}

export function isPremiumActive(subscription: { status: string } | null | undefined): boolean {
  return subscription?.status === 'active';
}

/** S-04 — planul gratuit: maximum 1 email de digest pe zi per utilizator. */
export function alreadySentDigestToday(sentTimestamps: string[], now: Date = new Date()): boolean {
  const todayIso = now.toISOString().slice(0, 10);
  return sentTimestamps.some((ts) => ts.slice(0, 10) === todayIso);
}

/** Nu re-notifica pentru aceeași ofertă + același motiv (odată e destul). */
export function alreadyNotifiedForOffer(
  notified: { offer_id: string; type: string }[],
  offerId: string,
  type: 'excellent' | 'price_drop'
): boolean {
  return notified.some((n) => n.offer_id === offerId && n.type === type);
}
