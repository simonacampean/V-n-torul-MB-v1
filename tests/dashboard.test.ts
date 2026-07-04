import { describe, it, expect } from 'vitest';
import { estimateMrr } from '../lib/dashboard';

describe('estimateMrr — AD-04', () => {
  it('calculează MRR din abonamente lunare și anuale amortizate', () => {
    // 3 lunar la 4,99€ + 2 anual la 49€/12 ≈ 14.97 + 8.1666... ⇒ 23.14
    const mrr = estimateMrr({ monthlyActive: 3, yearlyActive: 2, monthlyPriceCents: 499, yearlyPriceCents: 4900 });
    expect(mrr).toBeCloseTo(23.14, 2);
  });

  it('zero abonamente ⇒ 0', () => {
    expect(estimateMrr({ monthlyActive: 0, yearlyActive: 0, monthlyPriceCents: 499, yearlyPriceCents: 4900 })).toBe(0);
  });

  it('doar abonamente anuale ⇒ amortizare corectă pe lună', () => {
    const mrr = estimateMrr({ monthlyActive: 0, yearlyActive: 12, monthlyPriceCents: 499, yearlyPriceCents: 1200 });
    expect(mrr).toBeCloseTo(12, 2); // 12 abonați × 12€/an ÷ 12 luni = 12€/lună
  });
});
