// Teste pentru partea determinist a Calculatorului de Restaurare —
// detectarea problemelor și calculul bugetului NU trec prin Claude, deci
// sunt testabile izolat, fără ANTHROPIC_API_KEY.
import { describe, it, expect } from 'vitest';
import {
  detecteazaProbleme,
  calculeazaBuget,
  formateazaBuget,
  calculatorRestaurareOutputSchema,
  calculatorRestaurareAgent,
} from '../lib/agents/calculator-restaurare';

describe('detecteazaProbleme', () => {
  it('detectează problema de climatizare', () => {
    const p = detecteazaProbleme('Din păcate aerul nu funcționează, restul e ok.');
    expect(p).toHaveLength(1);
    expect(p[0].eticheta).toMatch(/aer condiționat/i);
    expect(p[0]).toMatchObject({ costMin: 250, costMax: 400 });
  });

  it('detectează puncte de rugină (RO și DE)', () => {
    expect(detecteazaProbleme('Are câteva puncte de rugină la praguri.')[0].costMin).toBe(400);
    expect(detecteazaProbleme('Leichte Rostschäden am Unterboden.')[0].costMax).toBe(800);
  });

  it('detectează scurgeri de ulei', () => {
    const p = detecteazaProbleme('Motorul pierde ulei ușor, de la garnitura de chiulasă.');
    expect(p[0].eticheta).toMatch(/scurgeri/i);
  });

  it('detectează retapițare și zgârieturi simultan', () => {
    const p = detecteazaProbleme('Interior retapitat recent, câteva zgârieturi pe aripa dreapta.');
    expect(p.map((x) => x.eticheta)).toEqual([
      expect.stringMatching(/retapițare/i),
      expect.stringMatching(/polish/i),
    ]);
  });

  it('nu detectează nimic pe text curat', () => {
    expect(detecteazaProbleme('Mașină impecabilă, fără niciun defect vizibil.')).toEqual([]);
  });

  it('e case-insensitive', () => {
    expect(detecteazaProbleme('ZGARIETURI vizibile pe capotă.')).toHaveLength(1);
  });
});

describe('calculeazaBuget', () => {
  it('fără nicio problemă detectată, bugetul e strict revizia obligatorie (300€)', () => {
    expect(calculeazaBuget([])).toEqual({ min: 300, max: 300 });
  });

  it('adaugă intervalele problemelor peste revizia obligatorie', () => {
    const buget = calculeazaBuget([
      { eticheta: 'a', costMin: 250, costMax: 400 },
      { eticheta: 'b', costMin: 400, costMax: 800 },
    ]);
    expect(buget).toEqual({ min: 250 + 400 + 300, max: 400 + 800 + 300 });
  });
});

describe('formateazaBuget', () => {
  it('formatează cu separator românesc de mii', () => {
    expect(formateazaBuget({ min: 700, max: 1200 })).toBe('700€ - 1.200€');
  });
  it('formatează valori mici fără separator', () => {
    expect(formateazaBuget({ min: 300, max: 300 })).toBe('300€ - 300€');
  });
});

describe('calculatorRestaurareOutputSchema', () => {
  it('validează un output corect', () => {
    const parsed = calculatorRestaurareOutputSchema.parse({
      buget_reimprospatare_estimat: '700€ - 1.200€',
      detaliere_necesitati: ['test'],
      mesaj_atentionare: 'test',
    });
    expect(parsed.buget_reimprospatare_estimat).toBe('700€ - 1.200€');
  });
});

describe('calculatorRestaurareAgent.run — fără text', () => {
  it('aruncă eroare când nu există text de analizat (apelantul e responsabil să nu-l cheme fără note)', async () => {
    await expect(calculatorRestaurareAgent.run({ modelCode: 'W124', text: null })).rejects.toThrow();
  });
});
