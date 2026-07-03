import { describe, it, expect } from 'vitest';
import { buildHuntUrl, groupPlatforms, SEED_PLATFORMS, type HuntModel } from '../lib/hunt';

const platform = (name: string) => SEED_PLATFORMS.find((p) => p.name === name)!;

const W124: HuntModel = { hunt_query: 'W124', year_from: 1984, year_to: 1997 };
const R129: HuntModel = { hunt_query: 'SL R129', year_from: 1989, year_to: 2001 };
const W201: HuntModel = { hunt_query: '190E W201', year_from: 1982, year_to: 1993 };

describe('buildHuntUrl — fidelitate cu v5 (F-02)', () => {
  it('mobile.de + W124: identic cu build(m) din v5', () => {
    expect(buildHuntUrl(platform('mobile.de'), W124)).toBe(
      'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&makeModelVariant1.makeId=17200&makeModelVariant1.modelDescription=W124&maxPrice=20000&minFirstRegistrationDate=1984-01-01&maxFirstRegistrationDate=1997-12-31'
    );
  });
  it('Kleinanzeigen + R129: querySlug (minuscule, spații → cratimă)', () => {
    expect(buildHuntUrl(platform('Kleinanzeigen'), R129)).toBe(
      'https://www.kleinanzeigen.de/s-autos/mercedes-sl-r129/k0c216'
    );
  });
  it('Leboncoin + W201: "mercedes " + query, encodat identic ca în v5', () => {
    expect(buildHuntUrl(platform('Leboncoin'), W201)).toBe(
      'https://www.leboncoin.fr/recherche?category=2&text=mercedes%20190E%20W201'
    );
  });
  it('Autovit.ro: fără {query}, doar ani — funcționează și fără query', () => {
    expect(buildHuntUrl(platform('Autovit.ro'), W124)).toBe(
      'https://www.autovit.ro/autoturisme/mercedes-benz/de-la-1984?search%5Bfilter_float_price%3Ato%5D=20000'
    );
  });
  it('returnează null dacă platforma nu are url_template', () => {
    expect(buildHuntUrl({ ...platform('mobile.de'), url_template: null }, W124)).toBeNull();
  });
});

describe('groupPlatforms — grupare major/med/collect (F-02)', () => {
  it('păstrează cele 3 grupe, în ordinea major → med → collect, cu toate cele 16 platforme', () => {
    const groups = groupPlatforms(SEED_PLATFORMS);
    expect(groups.map((g) => g.grp)).toEqual(['major', 'med', 'collect']);
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(16);
    expect(groups[0].items).toHaveLength(4);
    expect(groups[2].items).toHaveLength(6);
  });
});
