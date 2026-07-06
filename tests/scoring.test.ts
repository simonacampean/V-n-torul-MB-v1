import { describe, it, expect } from 'vitest';
import {
  verdictOf, offerScore, offerTotal, condOf, trCost,
  EXC_THRESHOLD, REG_COST,
  CRITERIA, scoreWatchlistItem, daysOnMarket, currentPrice, firstPrice, priceDropPct,
} from '../lib/scoring';

// Benzile din seed (stare #2)
const W124 = { lo: 9000, hi: 18000 };
const R129 = { lo: 13000, hi: 20000 };
const W140 = { lo: 6000, hi: 13000 };

describe('verdictOf — verdicte de preț pe grade de stare (v5)', () => {
  it('CHILIPIR sub 85% din pragul inferior', () => {
    // W124 stare #2: lo=9000 → 85% = 7650
    expect(verdictOf(W124, 7600, '2')?.key).toBe('CHILIPIR');
    expect(verdictOf(W124, 7650, '2')?.key).toBe('SUB'); // exact la 85% NU e chilipir (p < lo*0.85)
  });
  it('SUB / LA / PESTE pe banda de bază', () => {
    expect(verdictOf(W124, 8500, '2')?.key).toBe('SUB');
    expect(verdictOf(W124, 9000, '2')?.key).toBe('LA');
    expect(verdictOf(W124, 18000, '2')?.key).toBe('LA');
    expect(verdictOf(W124, 18001, '2')?.key).toBe('PESTE');
  });
  it('banda se ajustează cu multiplicatorul stării', () => {
    // stare #1 (×1.30): lo=11700, hi=23400
    const v1 = verdictOf(W124, 12000, '1');
    expect(v1?.key).toBe('LA');
    expect(v1?.lo).toBe(11700);
    expect(v1?.hi).toBe(23400);
    // stare #4 (×0.45): lo=4050 → chilipir sub 3442.5
    expect(verdictOf(W124, 3400, '4')?.key).toBe('CHILIPIR');
  });
  it('returnează null fără bandă sau preț', () => {
    expect(verdictOf(null, 5000)).toBeNull();
    expect(verdictOf(W124, null)).toBeNull();
  });
});

describe('offerScore — scor calitate-preț 0–100 (v5)', () => {
  it('cazul de referință din CLAUDE.md: W124, 8.500 €, #2, full, istoric, DA, DE, 125.000 km ⇒ 89, excelent', () => {
    const s = offerScore({
      band: W124, price: 8500, cond: '2', options: 'full',
      history: true, neg: 'DA', country: 'DE', km: 125000,
    });
    expect(s).toBe(89);
    expect(s >= EXC_THRESHOLD).toBe(true);
  });
  it('scor maxim teoretic plafonat la 100', () => {
    const s = offerScore({
      band: R129, price: 9000, cond: '2', options: 'full',
      history: true, neg: 'DA', country: 'RO', km: 100000,
    });
    expect(s).toBe(100); // 40+15+15+8+12+10
  });
  it('ofertă slabă: peste piață, standard, fără istoric, licitație, țară scumpă, km mari', () => {
    const s = offerScore({
      band: W140, price: 14000, cond: '2', options: 'standard',
      history: false, neg: 'NU', country: 'UK', km: 220000,
    });
    expect(s).toBe(8 + 3 + 0 + 0 + 3 + 4); // 18
  });
  it('km necunoscut primește 4 puncte, nu 0', () => {
    const a = offerScore({ band: W124, price: 10000, neg: 'PARTIAL', country: 'HU' });
    // 22 (LA) + 3 (standard) + 0 + 4 (PARTIAL) + 9 (HU=300≤600) + 4 (km null) = 42
    expect(a).toBe(42);
  });
  it('bonus de raritate (Arheologul de Opțiuni) se adaugă la scor', () => {
    const fara = offerScore({ band: W124, price: 10000, neg: 'PARTIAL', country: 'HU' });
    const cu = offerScore({ band: W124, price: 10000, neg: 'PARTIAL', country: 'HU', bonusDotariRare: 5 });
    expect(cu).toBe(fara + 5);
  });
  it('bonusul de raritate rămâne plafonat la 100 împreună cu restul', () => {
    const s = offerScore({
      band: R129, price: 9000, cond: '2', options: 'full',
      history: true, neg: 'DA', country: 'RO', km: 100000, bonusDotariRare: 10,
    });
    expect(s).toBe(100); // 40+15+15+8+12+10 = 100 deja; +10 tot 100, nu 110
  });
  it('fără bonus (undefined), scorul e neschimbat', () => {
    const s = offerScore({ band: W124, price: 8500, cond: '2', options: 'full', history: true, neg: 'DA', country: 'DE', km: 125000 });
    expect(s).toBe(89);
  });
});

describe('costuri de aducere și „la cheie"', () => {
  it('țară necunoscută → fallback 800 €', () => {
    expect(trCost('XX')).toBe(800);
    expect(trCost(undefined)).toBe(800);
  });
  it('offerTotal = preț + transport + înmatriculare (900)', () => {
    expect(offerTotal(8500, 'DE')).toBe(8500 + 600 + REG_COST);
    expect(offerTotal(8500, 'RO')).toBe(8500 + 0 + REG_COST);
    expect(offerTotal(null, 'DE')).toBeNull();
  });
});

describe('condOf', () => {
  it('acceptă string sau număr, fallback la #2', () => {
    expect(condOf('1').mult).toBe(1.3);
    expect(condOf(3).mult).toBe(0.7);
    expect(condOf(undefined).mult).toBe(1.0);
    expect(condOf('99').mult).toBe(1.0);
  });
});

describe('scoreWatchlistItem — 6 criterii ponderate ale Listei mele (v5)', () => {
  it('ponderile însumează 100', () => {
    expect(CRITERIA.reduce((s, c) => s + c.w, 0)).toBe(100);
  });
  it('fără criterii bifate ⇒ 0', () => {
    expect(scoreWatchlistItem(null)).toBe(0);
    expect(scoreWatchlistItem({})).toBe(0);
  });
  it('toate bifate ⇒ 100', () => {
    const all = Object.fromEntries(CRITERIA.map((c) => [c.id, true]));
    expect(scoreWatchlistItem(all)).toBe(100);
  });
  it('doar service + original ⇒ 50 (25+25), restul ignorate', () => {
    expect(scoreWatchlistItem({ service: true, original: true, tehnic: false })).toBe(50);
  });
});

describe('daysOnMarket / istoric de preț', () => {
  it('0 zile pentru o dată de acum', () => {
    expect(daysOnMarket(new Date())).toBe(0);
  });
  it('calculează corect zilele trecute', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000 - 1000);
    expect(daysOnMarket(tenDaysAgo)).toBe(10);
  });
  it('currentPrice/firstPrice folosesc istoricul dacă există, altfel fallback', () => {
    const hist = [{ price: 9000, at: '2026-01-01' }, { price: 8500, at: '2026-02-01' }];
    expect(firstPrice(hist, 7000)).toBe(9000);
    expect(currentPrice(hist, 7000)).toBe(8500);
    expect(firstPrice(null, 7000)).toBe(7000);
    expect(currentPrice(undefined, 7000)).toBe(7000);
  });
  it('priceDropPct calculează scăderea procentuală, 0 dacă a crescut sau lipsește istoricul', () => {
    const hist = [{ price: 10000, at: '2026-01-01' }, { price: 8500, at: '2026-02-01' }];
    expect(priceDropPct(hist, null)).toBe(15);
    expect(priceDropPct([{ price: 8000, at: 'a' }, { price: 9000, at: 'b' }], null)).toBe(0);
    expect(priceDropPct(null, 8500)).toBe(0);
  });
});
