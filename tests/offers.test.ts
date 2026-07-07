import { describe, it, expect } from 'vitest';
import {
  extractAgentReport, validateOffers, fingerprintOf, isCloseMatch, planOfferImport, type ValidatedOffer,
} from '../lib/offers';

const MODEL_CODES = ['W124', 'R129', 'W201', 'W126', 'W123', 'W140'];

describe('extractAgentReport — extrage blocul JSON din text liber (I-02)', () => {
  it('acceptă JSON pur', () => {
    const result = extractAgentReport('{"generated":"2026-07-03","offers":[{"model":"W124","title":"x","price":8500}]}');
    if ('error' in result) throw new Error('nu ar trebui să eșueze');
    expect(result.offers).toHaveLength(1);
  });
  it('extrage JSON din text amestecat (v5: agentul poate trimite proză + JSON)', () => {
    const text = 'Iată raportul de azi:\n{"generated":"2026-07-03","offers":[{"model":"W124","title":"x","price":8500}]}\nSper să ajute!';
    const result = extractAgentReport(text);
    if ('error' in result) throw new Error('nu ar trebui să eșueze');
    expect(result.generated).toBe('2026-07-03');
    expect(result.offers).toHaveLength(1);
  });
  it('respinge text fără JSON', () => {
    const result = extractAgentReport('nu există niciun raport aici');
    expect('error' in result).toBe(true);
  });
  it('respinge JSON fără array offers', () => {
    const result = extractAgentReport('{"generated":"2026-07-03"}');
    expect('error' in result).toBe(true);
  });
  it('acceptă offers gol (rutina programată trebuie să poată trimite un heartbeat fără oferte noi — validarea "gol" e responsabilitatea fluxurilor consumatoare, nu a parsării)', () => {
    const result = extractAgentReport('{"offers":[]}');
    if ('error' in result) throw new Error('nu ar trebui să eșueze');
    expect(result.offers).toHaveLength(0);
  });
});

describe('validateOffers — filtrare + normalizare (v5: A.importAgent)', () => {
  it('filtrează ofertele fără titlu, model necunoscut sau preț neparsabil', () => {
    const raw = [
      { model: 'W124', title: 'validă', price: '8500' },
      { model: 'NECUNOSCUT', title: 'model rău', price: '9000' },
      { model: 'W124', title: '', price: '9000' },
      { model: 'W124', title: 'fără preț', price: 'gratis' },
      null,
    ];
    const { valid, skipped } = validateOffers(raw, MODEL_CODES);
    expect(valid).toHaveLength(1);
    expect(skipped).toBe(4);
    expect(valid[0].price).toBe(8500);
  });

  it('aplică fallback-uri sensibile pentru cond/options/neg/country', () => {
    const raw = [{ model: 'W124', title: 't', price: '8500' }];
    const { valid } = validateOffers(raw, MODEL_CODES);
    expect(valid[0]).toMatchObject({ cond: '2', options: 'standard', negotiability: 'DA', country: 'DE' });
  });

  it('păstrează valorile explicite când sunt valide', () => {
    const raw = [
      {
        model: 'R129', title: 'SL500', price: '16000', url: 'https://x.test/1',
        year: '1996', km: '95000', cond: '1', options: 'FULL', history: true,
        neg: 'PARTIAL', country: 'de', note: 'hardtop inclus',
      },
    ];
    const { valid } = validateOffers(raw, MODEL_CODES);
    expect(valid[0]).toMatchObject({
      model_code: 'R129', price: 16000, url: 'https://x.test/1', year: 1996, km: 95000,
      cond: '1', options: 'full', history_verified: true, negotiability: 'PARTIAL',
      country: 'DE', note: 'hardtop inclus',
    });
  });
});

describe('fingerprintOf / isCloseMatch — I-05 deduplicare', () => {
  it('fingerprint combină model + an', () => {
    expect(fingerprintOf('W124', 1992)).toBe('W124|1992');
    expect(fingerprintOf('W124', null)).toBe('W124|?');
  });

  it('detectează potrivire apropiată în limita de ±5%', () => {
    expect(isCloseMatch({ price: 10000, km: 100000 }, { price: 10400, km: 103000 })).toBe(true);
    expect(isCloseMatch({ price: 10000, km: 100000 }, { price: 10600, km: 100000 })).toBe(false);
    expect(isCloseMatch({ price: 10000, km: 100000 }, { price: 10200, km: 106000 })).toBe(false);
  });

  it('ignoră km-ul în comparație dacă lipsește la oricare ofertă', () => {
    expect(isCloseMatch({ price: 10000, km: null }, { price: 10300, km: 100000 })).toBe(true);
  });
});

describe('planOfferImport — criteriul de acceptare M2: reimportul aceluiași raport nu creează duplicate', () => {
  const offerA: ValidatedOffer = {
    model_code: 'W124', title: '300CE-24', price: 8500, url: 'https://x.test/a',
    year: 1992, km: 125000, cond: '2', options: 'full', history_verified: true,
    negotiability: 'DA', country: 'DE', note: null,
  };
  const offerB: ValidatedOffer = {
    model_code: 'R129', title: 'SL500', price: 16000, url: 'https://x.test/b',
    year: 1996, km: 95000, cond: '1', options: 'full', history_verified: false,
    negotiability: 'PARTIAL', country: 'CH', note: null,
  };

  it('primul import: nimic existent ⇒ ambele merg la insert', () => {
    const plan = planOfferImport([offerA, offerB], []);
    expect(plan.toInsert).toHaveLength(2);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it('reimportul EXACT al aceluiași raport ⇒ 0 inserturi noi, doar refresh (pe URL)', () => {
    const existing = [
      { id: 'id-a', model_code: 'W124', year: 1992, price: 8500, km: 125000, url: 'https://x.test/a' },
      { id: 'id-b', model_code: 'R129', year: 1996, price: 16000, km: 95000, url: 'https://x.test/b' },
    ];
    const plan = planOfferImport([offerA, offerB], existing);
    expect(plan.toInsert).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(2);
    expect(plan.toUpdate.every((u) => !u.priceChanged)).toBe(true);
  });

  it('reimport cu preț schimbat pe același URL ⇒ tot refresh (nu insert nou), dar semnalează schimbarea de preț', () => {
    const existing = [
      { id: 'id-a', model_code: 'W124', year: 1992, price: 9000, km: 125000, url: 'https://x.test/a' },
    ];
    const plan = planOfferImport([offerA], existing);
    expect(plan.toInsert).toHaveLength(0);
    expect(plan.toUpdate).toEqual([{ id: 'id-a', price: 8500, priceChanged: true }]);
  });

  it('fără URL, dedup fuzzy pe fingerprint + km/preț ±5% (I-05) — tot fără duplicat', () => {
    const noUrlOffer: ValidatedOffer = { ...offerA, url: null };
    const existing = [
      { id: 'id-a', model_code: 'W124', year: 1992, price: 8600, km: 128000, url: null },
    ];
    const plan = planOfferImport([noUrlOffer], existing);
    expect(plan.toInsert).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(1);
  });

  it('ofertă nouă, reală (alt model/an) ⇒ insert, chiar cu alte oferte deja existente', () => {
    const existing = [
      { id: 'id-a', model_code: 'W124', year: 1992, price: 8500, km: 125000, url: 'https://x.test/a' },
    ];
    const plan = planOfferImport([offerA, offerB], existing);
    expect(plan.toInsert).toEqual([offerB]);
    expect(plan.toUpdate).toHaveLength(1);
  });
});
