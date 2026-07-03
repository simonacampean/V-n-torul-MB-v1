import { describe, it, expect } from 'vitest';
import {
  isEligibleForAlert, priceDropPercent, pickAlertReason, isPremiumActive, alreadySentDigestToday, alreadyNotifiedForOffer,
  type UserPrefsLite, type OfferForAlert,
} from '../lib/notifications';

const basePrefs: UserPrefsLite = {
  followed_models: ['W124'],
  alert_threshold: 85,
  max_budget: 20000,
  preferred_countries: [],
  email_alerts: true,
};

const baseOffer: OfferForAlert = { model_code: 'W124', price: 9000, country: 'DE', score: 90 };

describe('isEligibleForAlert — S-02/S-05', () => {
  it('eligibil când toate condițiile sunt îndeplinite', () => {
    expect(isEligibleForAlert(basePrefs, baseOffer)).toBe(true);
  });
  it('neeligibil dacă alertele email sunt oprite', () => {
    expect(isEligibleForAlert({ ...basePrefs, email_alerts: false }, baseOffer)).toBe(false);
  });
  it('neeligibil dacă nu urmărește niciun model (opt-in, nu spam implicit)', () => {
    expect(isEligibleForAlert({ ...basePrefs, followed_models: [] }, baseOffer)).toBe(false);
  });
  it('neeligibil dacă modelul ofertei nu e urmărit', () => {
    expect(isEligibleForAlert(basePrefs, { ...baseOffer, model_code: 'R129' })).toBe(false);
  });
  it('neeligibil dacă prețul depășește bugetul maxim', () => {
    expect(isEligibleForAlert({ ...basePrefs, max_budget: 8000 }, baseOffer)).toBe(false);
  });
  it('țările preferate: filtrează doar dacă lista nu e goală', () => {
    expect(isEligibleForAlert({ ...basePrefs, preferred_countries: ['RO'] }, baseOffer)).toBe(false);
    expect(isEligibleForAlert({ ...basePrefs, preferred_countries: ['DE'] }, baseOffer)).toBe(true);
    expect(isEligibleForAlert({ ...basePrefs, preferred_countries: [] }, baseOffer)).toBe(true);
  });
});

describe('pickAlertReason — S-02: „excelentă” sau scădere de preț, condiții independente', () => {
  it('„excellent” când oferta e marcată excelentă și scorul trece pragul personal', () => {
    expect(pickAlertReason({ alert_threshold: 85 }, { score: 90, excellent: true }, 0)).toBe('excellent');
  });
  it('nu dă „excellent” dacă scorul personal cerut e mai mare decât scorul ofertei, chiar dacă e "excellent" global', () => {
    expect(pickAlertReason({ alert_threshold: 95 }, { score: 90, excellent: true }, 0)).not.toBe('excellent');
  });
  it('„price_drop” independent de scor — un scor mic tot alertează la scădere de preț ≥10%', () => {
    expect(pickAlertReason({ alert_threshold: 85 }, { score: 40, excellent: false }, 12)).toBe('price_drop');
  });
  it('null dacă nu e nici excelentă (pt. pragul userului), nici scădere de preț relevantă', () => {
    expect(pickAlertReason({ alert_threshold: 85 }, { score: 60, excellent: false }, 4)).toBeNull();
  });
  it('preferă „excellent” peste „price_drop” când ambele s-ar aplica', () => {
    expect(pickAlertReason({ alert_threshold: 85 }, { score: 90, excellent: true }, 15)).toBe('excellent');
  });
});

describe('priceDropPercent', () => {
  it('calculează procentul de scădere, rotunjit', () => {
    expect(priceDropPercent(9000, 10000)).toBe(10);
    expect(priceDropPercent(8500, 10000)).toBe(15);
  });
  it('0 dacă prețul a crescut sau a rămas la fel', () => {
    expect(priceDropPercent(10000, 10000)).toBe(0);
    expect(priceDropPercent(11000, 10000)).toBe(0);
  });
});

describe('isPremiumActive', () => {
  it('adevărat doar pentru status active', () => {
    expect(isPremiumActive({ status: 'active' })).toBe(true);
    expect(isPremiumActive({ status: 'inactive' })).toBe(false);
    expect(isPremiumActive(null)).toBe(false);
    expect(isPremiumActive(undefined)).toBe(false);
  });
});

describe('alreadySentDigestToday — S-04 anti-spam', () => {
  const now = new Date('2026-07-04T10:00:00.000Z');
  it('adevărat dacă există un digest trimis azi', () => {
    expect(alreadySentDigestToday(['2026-07-04T06:00:00.000Z'], now)).toBe(true);
  });
  it('fals dacă ultimul digest a fost ieri', () => {
    expect(alreadySentDigestToday(['2026-07-03T23:59:00.000Z'], now)).toBe(false);
  });
  it('fals fără istoric', () => {
    expect(alreadySentDigestToday([], now)).toBe(false);
  });
});

describe('alreadyNotifiedForOffer', () => {
  it('nu re-notifică pentru aceeași ofertă + motiv', () => {
    const notified = [{ offer_id: 'a', type: 'excellent' }];
    expect(alreadyNotifiedForOffer(notified, 'a', 'excellent')).toBe(true);
    expect(alreadyNotifiedForOffer(notified, 'a', 'price_drop')).toBe(false);
    expect(alreadyNotifiedForOffer(notified, 'b', 'excellent')).toBe(false);
  });
});
