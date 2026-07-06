import { describe, it, expect } from 'vitest';
import { calculeazaEconomie } from '../lib/success-stories';

describe('calculeazaEconomie', () => {
  it('calculează diferența când prețul mediu de piață e mai mare decât achiziția', () => {
    expect(calculeazaEconomie(8500, 10900)).toBe(2400);
  });

  it('întoarce null când nu există preț mediu de piață', () => {
    expect(calculeazaEconomie(8500, null)).toBeNull();
  });

  it('întoarce null când achiziția a fost mai scumpă (nicio economie reală)', () => {
    expect(calculeazaEconomie(11000, 10900)).toBeNull();
  });

  it('întoarce null când prețurile sunt egale (nicio economie)', () => {
    expect(calculeazaEconomie(9000, 9000)).toBeNull();
  });
});
