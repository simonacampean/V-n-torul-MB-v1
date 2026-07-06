// Teste pentru partea determinist a Negociatorului din Umbră — text_diff,
// detectarea semnalelor de urgență și calculul indicelui (0-100) NU trec
// prin Claude, deci sunt testabile complet izolat, fără ANTHROPIC_API_KEY.
import { describe, it, expect } from 'vitest';
import {
  textDiff,
  detecteazaSemnaleUrgenta,
  calculeazaIndiceUrgenta,
  construiesteSchimbariCheie,
  negociatorOutputSchema,
  type PricePoint,
} from '../lib/agents/negociator-umbra';

describe('textDiff', () => {
  it('întoarce liste goale dacă nu există descriere anterioară', () => {
    const r = textDiff(null, 'Mașină superbă, vopsea originală.');
    expect(r.adaugat).toEqual([]);
    expect(r.eliminat).toEqual([]);
  });

  it('detectează propoziții adăugate și eliminate', () => {
    const anterioara = 'Mașină superbă. Preț ferm, nu negociez. Km reali.';
    const curenta = 'Mașină superbă. Trebuie să vând urgent. Km reali.';
    const r = textDiff(anterioara, curenta);
    expect(r.adaugat).toContain('Trebuie să vând urgent.');
    expect(r.eliminat).toContain('Preț ferm, nu negociez.');
  });

  it('ignoră propoziții identice (case-insensitive)', () => {
    const r = textDiff('Mașină superbă.', 'MAȘINĂ SUPERBĂ.');
    expect(r.adaugat).toEqual([]);
    expect(r.eliminat).toEqual([]);
  });
});

describe('detecteazaSemnaleUrgenta', () => {
  it('detectează semnale multiple în textul adăugat', () => {
    const diff = { adaugat: ['Trebuie sa vand urgent, plec din tara saptamana viitoare.'], eliminat: [] };
    const { semnale, puncte } = detecteazaSemnaleUrgenta(diff);
    expect(semnale.length).toBe(3); // plecare, presiune, urgent
    expect(puncte).toBe(25 + 20 + 20);
  });

  it('detectează renunțarea la o poziție de preț ferm în textul eliminat', () => {
    const diff = { adaugat: [], eliminat: ['Preț ferm, nu negociez sub acest preț.'] };
    const { semnale, puncte } = detecteazaSemnaleUrgenta(diff);
    expect(semnale).toContain('A renunțat la poziția inițială de preț ferm/nenegociabil');
    expect(puncte).toBe(20);
  });

  it('nu detectează nimic pe text neutru', () => {
    const diff = { adaugat: ['Mașină în stare foarte bună.'], eliminat: [] };
    const { semnale, puncte } = detecteazaSemnaleUrgenta(diff);
    expect(semnale).toEqual([]);
    expect(puncte).toBe(0);
  });
});

describe('calculeazaIndiceUrgenta', () => {
  it('o singură scădere de preț adaugă un increment de bază', () => {
    const history: PricePoint[] = [
      { price: 10000, at: '2026-01-01' },
      { price: 9000, at: '2026-01-10' },
    ];
    expect(calculeazaIndiceUrgenta(history, 0)).toBe(15);
  });

  it('scăderi succesive în <30 zile cresc exponențial', () => {
    const history: PricePoint[] = [
      { price: 10000, at: '2026-01-01' },
      { price: 9000, at: '2026-01-10' },
      { price: 8000, at: '2026-01-20' },
    ];
    // runda 1: +15 (consecutive=1) · runda 2: +30 (consecutive=2) = 45
    expect(calculeazaIndiceUrgenta(history, 0)).toBe(45);
  });

  it('scăderi la interval ≥30 zile NU cumulează exponențial (tratate izolat)', () => {
    const history: PricePoint[] = [
      { price: 10000, at: '2026-01-01' },
      { price: 9000, at: '2026-03-01' },
    ];
    expect(calculeazaIndiceUrgenta(history, 0)).toBe(15);
  });

  it('o creștere de preț resetează contorul de scăderi consecutive', () => {
    const history: PricePoint[] = [
      { price: 10000, at: '2026-01-01' },
      { price: 9000, at: '2026-01-10' }, // -1000, +15
      { price: 9500, at: '2026-01-15' }, // crește, reset
    ];
    expect(calculeazaIndiceUrgenta(history, 0)).toBe(15);
  });

  it('adaugă punctele semnalelor peste indicele de bază din preț', () => {
    const history: PricePoint[] = [
      { price: 10000, at: '2026-01-01' },
      { price: 9000, at: '2026-01-10' },
    ];
    expect(calculeazaIndiceUrgenta(history, 30)).toBe(45);
  });

  it('se plafonează la 100', () => {
    const history: PricePoint[] = [
      { price: 10000, at: '2026-01-01' },
      { price: 9000, at: '2026-01-05' },
      { price: 8000, at: '2026-01-10' },
      { price: 7000, at: '2026-01-15' },
    ];
    expect(calculeazaIndiceUrgenta(history, 50)).toBe(100);
  });

  it('fără istoric de preț (sau un singur punct), indicele vine doar din semnale', () => {
    expect(calculeazaIndiceUrgenta([{ price: 10000, at: '2026-01-01' }], 20)).toBe(20);
    expect(calculeazaIndiceUrgenta([], 20)).toBe(20);
  });
});

describe('construiesteSchimbariCheie', () => {
  it('include scăderea de preț ca intrare descriptivă', () => {
    const history: PricePoint[] = [
      { price: 10000, at: '2026-01-01' },
      { price: 9000, at: '2026-01-11' },
    ];
    const schimbari = construiesteSchimbariCheie({ adaugat: [], eliminat: [] }, [], history);
    expect(schimbari.some((s) => s.includes('10%') && s.includes('10000€') && s.includes('9000€'))).toBe(true);
  });

  it('include semnalele și fragmentele de text adăugat/eliminat', () => {
    const schimbari = construiesteSchimbariCheie(
      { adaugat: ['Trebuie să vând urgent.'], eliminat: ['Preț ferm.'] },
      ['Semnal X'],
      []
    );
    expect(schimbari).toContain('Semnal X');
    expect(schimbari.some((s) => s.includes('Trebuie să vând urgent.'))).toBe(true);
    expect(schimbari.some((s) => s.includes('Preț ferm.'))).toBe(true);
  });
});

describe('negociatorOutputSchema', () => {
  it('validează un output corect', () => {
    const parsed = negociatorOutputSchema.parse({
      indice_urgenta: 45,
      schimbari_cheie_detectate: ['test'],
      strategie_negociere_recomandata: 'Propune un preț cu 10% mai mic.',
    });
    expect(parsed.indice_urgenta).toBe(45);
  });

  it('respinge un indice în afara intervalului 0-100', () => {
    expect(() =>
      negociatorOutputSchema.parse({
        indice_urgenta: 150,
        schimbari_cheie_detectate: [],
        strategie_negociere_recomandata: 'x',
      })
    ).toThrow();
  });
});
