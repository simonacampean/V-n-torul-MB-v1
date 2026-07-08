import { describe, it, expect } from 'vitest';
import { sortedTrendPoints, trendGrowthPct, type TrendPoint } from '../lib/trends';

describe('sortedTrendPoints — ordonare crescătoare după an', () => {
  it('sortează puncte primite în dezordine', () => {
    const points: TrendPoint[] = [
      { an: 2023, pret: 15000 },
      { an: 2021, pret: 12000 },
      { an: 2022, pret: 13500 },
    ];
    expect(sortedTrendPoints(points).map((p) => p.an)).toEqual([2021, 2022, 2023]);
  });
  it('nu mută array-ul original', () => {
    const points: TrendPoint[] = [{ an: 2023, pret: 1 }, { an: 2021, pret: 1 }];
    const copy = [...points];
    sortedTrendPoints(points);
    expect(points).toEqual(copy);
  });
});

describe('trendGrowthPct — creștere procentuală primul → ultimul an', () => {
  it('null sub 2 puncte (0 sau 1 an) — graficul se ascunde, nu ghicim o tendință', () => {
    expect(trendGrowthPct([])).toBeNull();
    expect(trendGrowthPct([{ an: 2024, pret: 10000 }])).toBeNull();
  });
  it('creștere pozitivă, rotunjită', () => {
    const points: TrendPoint[] = [
      { an: 2021, pret: 10000 },
      { an: 2026, pret: 12800 },
    ];
    expect(trendGrowthPct(points)).toBe(28);
  });
  it('scădere → procent negativ', () => {
    const points: TrendPoint[] = [
      { an: 2021, pret: 20000 },
      { an: 2026, pret: 18000 },
    ];
    expect(trendGrowthPct(points)).toBe(-10);
  });
  it('folosește doar primul și ultimul an, ignoră fluctuațiile intermediare', () => {
    const points: TrendPoint[] = [
      { an: 2021, pret: 10000 },
      { an: 2023, pret: 6000 }, // scădere bruscă intermediară
      { an: 2026, pret: 11000 },
    ];
    expect(trendGrowthPct(points)).toBe(10);
  });
  it('e independent de ordinea de intrare (sortează intern)', () => {
    const points: TrendPoint[] = [
      { an: 2026, pret: 12000 },
      { an: 2021, pret: 10000 },
    ];
    expect(trendGrowthPct(points)).toBe(20);
  });
  it('null când primul preț e 0 sau negativ (împărțire nedefinită)', () => {
    expect(trendGrowthPct([{ an: 2021, pret: 0 }, { an: 2026, pret: 5000 }])).toBeNull();
  });
});
