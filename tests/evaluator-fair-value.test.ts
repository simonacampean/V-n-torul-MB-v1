import { describe, it, expect } from 'vitest';
import {
  estimeazaCilindreeDinTitlu,
  determinaCilindreeLitri,
  selecteazaCeleMaiApropiateComps,
  clasificaDeviatie,
  evalueazaFairValue,
  type ComparableOffer,
} from '../lib/agents/evaluator-fair-value';

describe('estimeazaCilindreeDinTitlu — convenția de denumire Mercedes (determinist)', () => {
  it('extrage din sufix NUMĂR+LITERE (300CE, 230E, 560SEL)', () => {
    expect(estimeazaCilindreeDinTitlu('W124', 'Mercedes-Benz 300CE (C124), 1989')).toBe(3.0);
    expect(estimeazaCilindreeDinTitlu('W124', 'Mercedes-Benz 230E, stare bună')).toBe(2.3);
    expect(estimeazaCilindreeDinTitlu('W126', 'Mercedes-Benz 560SEL, 1987')).toBe(5.6);
  });

  it('extrage din prefix LITERE+NUMĂR (SL500, SL 320)', () => {
    expect(estimeazaCilindreeDinTitlu('R129', 'Mercedes-Benz SL 500 (1997)')).toBe(5.0);
    expect(estimeazaCilindreeDinTitlu('R129', 'Mercedes-Benz SL 320 (1994)')).toBe(3.2);
  });

  it('extrage și ordinea NUMĂR+SL (500 SL)', () => {
    expect(estimeazaCilindreeDinTitlu('R129', 'Mercedes-Benz 500 SL (1992) — 50.000 km')).toBe(5.0);
  });

  it('W201 (190E): NU ghicește 1.9L din „190" — cere sufix explicit de cilindree', () => {
    expect(estimeazaCilindreeDinTitlu('W201', 'Mercedes Benz 190 E, stare foarte bună')).toBeNull();
    expect(estimeazaCilindreeDinTitlu('W201', 'Mercedes-Benz 190E 2.3-16 Evo II')).toBe(2.3);
    expect(estimeazaCilindreeDinTitlu('W201', '190E 2.6 automat')).toBe(2.6);
  });

  it('întoarce null când titlul nu conține niciun indiciu recunoscut', () => {
    expect(estimeazaCilindreeDinTitlu('W123', 'Mașină frumoasă de vânzare')).toBeNull();
  });
});

describe('determinaCilindreeLitri — preferă mențiunea explicită din text peste convenția de denumire', () => {
  it('folosește „X litri" din notă chiar dacă titlul ar sugera altceva', () => {
    // titlul „300CE" ar sugera 3.0L, dar textul menționează explicit 3.2 litri (motor swap, de ex.)
    expect(determinaCilindreeLitri('W124', 'Mercedes-Benz 300CE', 'motor de 3.2 litri, cutie automată')).toBe(3.2);
  });

  it('cade pe convenția de denumire dacă textul nu are o mențiune explicită', () => {
    expect(determinaCilindreeLitri('W124', 'Mercedes-Benz 300CE (C124), 1989', 'stare foarte bună, fără rugină')).toBe(3.0);
  });

  it('întoarce null dacă nu găsește niciun indiciu nicăieri', () => {
    expect(determinaCilindreeLitri('W123', 'Mașină de vânzare', null)).toBeNull();
  });
});

describe('selecteazaCeleMaiApropiateComps — k cele mai apropiate după an/cilindree/dotări (determinist)', () => {
  const comps: ComparableOffer[] = [
    { price: 10000, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 }, // aproape
    { price: 20000, year: 1970, cilindreeLitri: 5.6, bonusDotariRare: 8 }, // departe
    { price: 11000, year: 1991, cilindreeLitri: 3.0, bonusDotariRare: 3 }, // aproape
  ];

  it('alege comps-urile cele mai apropiate de țintă, nu doar primele din listă', () => {
    const rezultat = selecteazaCeleMaiApropiateComps({ year: 1989, cilindreeLitri: 3.0, bonusDotariRare: 2 }, comps, 2);
    expect(rezultat).toHaveLength(2);
    expect(rezultat.map((c) => c.price).sort()).toEqual([10000, 11000]);
  });

  it('respectă limita cerută', () => {
    const rezultat = selecteazaCeleMaiApropiateComps({ year: 1989, cilindreeLitri: 3.0, bonusDotariRare: 2 }, comps, 1);
    expect(rezultat).toHaveLength(1);
    expect(rezultat[0].price).toBe(10000);
  });
});

describe('clasificaDeviatie — scala de 5 trepte pe deviația procentuală (exact pragurile din cerință)', () => {
  it('Foarte Ieftin: deviație < -25%', () => {
    expect(clasificaDeviatie(7000, 10000).eticheta).toBe('Foarte Ieftin'); // -30%
  });
  it('Ieftin: între -25% și -10%', () => {
    expect(clasificaDeviatie(8000, 10000).eticheta).toBe('Ieftin'); // -20%
  });
  it('Moderat: între -10% și +10%', () => {
    expect(clasificaDeviatie(10000, 10000).eticheta).toBe('Moderat'); // 0%
    expect(clasificaDeviatie(10900, 10000).eticheta).toBe('Moderat'); // +9%
  });
  it('Scump: între +10% și +25%', () => {
    expect(clasificaDeviatie(11500, 10000).eticheta).toBe('Scump'); // +15%
  });
  it('Foarte Scump: deviație > +25%', () => {
    expect(clasificaDeviatie(14000, 10000).eticheta).toBe('Foarte Scump'); // +40%
  });
  it('calculează deviatieProcentuala corect (rotunjită la o zecimală)', () => {
    expect(clasificaDeviatie(12000, 10000).deviatieProcentuala).toBe(20);
  });
});

describe('evalueazaFairValue — integrare completă (comps → fair value → etichetă)', () => {
  it('„date insuficiente" sub pragul de 3 comps — NU inventează o etichetă', () => {
    const rezultat = evalueazaFairValue({
      price: 10000,
      year: 1990,
      cilindreeLitri: 3.0,
      bonusDotariRare: 2,
      comps: [
        { price: 9000, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 },
        { price: 9500, year: 1991, cilindreeLitri: 3.0, bonusDotariRare: 2 },
      ],
    });
    expect(rezultat.dateInsuficiente).toBe(true);
    expect(rezultat.eticheta).toBeNull();
    expect(rezultat.fairValuePret).toBeNull();
  });

  it('calculează fair-value ca mediană a comps-urilor + etichetă corectă, cu ≥3 comps', () => {
    const rezultat = evalueazaFairValue({
      price: 15000,
      year: 1990,
      cilindreeLitri: 3.0,
      bonusDotariRare: 2,
      comps: [
        { price: 9000, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 },
        { price: 10000, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 },
        { price: 11000, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 },
      ],
    });
    expect(rezultat.dateInsuficiente).toBe(false);
    expect(rezultat.fairValuePret).toBe(10000); // mediana [9000,10000,11000]
    expect(rezultat.eticheta).toBe('Foarte Scump'); // 15000 vs 10000 = +50%
    expect(rezultat.compsFolosite).toBe(3);
  });

  it('exclude comps-uri prea îndepărtate când sunt mai multe decât limita (max 5 comps folosite)', () => {
    const comps: ComparableOffer[] = [
      { price: 9000, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 },
      { price: 9500, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 },
      { price: 10000, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 },
      { price: 10500, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 },
      { price: 11000, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2 },
      { price: 50000, year: 1960, cilindreeLitri: 7.3, bonusDotariRare: 10 }, // outlier, foarte departe — al 6-lea, exclus de limita de 5
    ];
    const rezultat = evalueazaFairValue({ price: 10000, year: 1990, cilindreeLitri: 3.0, bonusDotariRare: 2, comps });
    expect(rezultat.compsFolosite).toBe(5);
    expect(rezultat.fairValuePret).toBe(10000); // outlier-ul nu ar trebui să tragă mediana în sus
  });
});
