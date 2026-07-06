// Teste pentru partea determinist a Filtrului Anti-Fals — extragerea de
// indicii tehnice, detectarea sintagmelor suspecte și corelația
// model/insignă/spec NU trec prin Claude, deci sunt testabile izolat.
import { describe, it, expect } from 'vitest';
import {
  extrageIndiciiTehnice,
  detecteazaSintagmeSuspecte,
  verificaCorelatieBadge,
  filtruAntiFalsOutputSchema,
} from '../lib/agents/filtru-anti-fals';

describe('extrageIndiciiTehnice', () => {
  it('extrage capacitatea cilindrică în litri', () => {
    expect(extrageIndiciiTehnice('Motorul este de 2.0 litri diesel.').capacitateLitri).toBe(2.0);
    expect(extrageIndiciiTehnice('Motor 5.0 litri, V8 benzină.').capacitateLitri).toBe(5.0);
  });

  it('detectează combustibilul', () => {
    expect(extrageIndiciiTehnice('Motor 2.0 diesel, consum redus.').combustibil).toBe('diesel');
    expect(extrageIndiciiTehnice('Motor pe benzină, V8.').combustibil).toBe('benzina');
    expect(extrageIndiciiTehnice('Fără informații despre combustibil.').combustibil).toBeNull();
  });

  it('detectează configurația de cilindri', () => {
    expect(extrageIndiciiTehnice('Motor V8 5.0 litri.').cilindri).toBe('V8');
    expect(extrageIndiciiTehnice('Motor V12 impecabil.').cilindri).toBe('V12');
  });
});

describe('detecteazaSintagmeSuspecte', () => {
  it('detectează un pachet AMG montat ulterior', () => {
    const semnale = detecteazaSintagmeSuspecte('Are un pachet AMG aplicat ulterior, arată superb.');
    expect(semnale).toContain('Menționează un pachet AMG montat ulterior / doar de aspect, nu de fabrică');
  });

  it('detectează o conversie facelift', () => {
    const semnale = detecteazaSintagmeSuspecte('Mașina a suferit o conversie facelift acum 2 ani.');
    expect(semnale.length).toBeGreaterThan(0);
  });

  it('nu detectează nimic pe text neutru', () => {
    expect(detecteazaSintagmeSuspecte('Mașină în stare foarte bună, service la zi.')).toEqual([]);
  });
});

describe('verificaCorelatieBadge', () => {
  it('exemplul din spec: „Mercedes E500 AMG W124” cu motor 2.0 diesel în text', () => {
    const text = 'Mercedes E500 AMG W124 de vânzare. Motorul este de 2.0 litri diesel, consum foarte bun.';
    const r = verificaCorelatieBadge('W124', text, 1993);
    expect(r.insignaRevendicata).toBe('e500');
    expect(r.variantaCunoscuta?.capacitateLitri).toBe(5.0);
    expect(r.conflicteTehnice.some((c) => c.includes('2L'))).toBe(true);
    expect(r.conflicteTehnice.some((c) => c.includes('diesel'))).toBe(true);
  });

  it('detectează anul în afara perioadei reale de producție', () => {
    const text = 'Mercedes 500E W124, motor V8 5.0 litri, benzină.';
    const r = verificaCorelatieBadge('W124', text, 2005);
    expect(r.insignaRevendicata).toBe('500e');
    expect(r.conflicteTehnice.some((c) => c.includes('2005') && c.includes('1990-1995'))).toBe(true);
  });

  it('nu găsește conflicte când insigna corespunde perfect specificațiilor', () => {
    const text = 'Mercedes 500E W124, motor V8 5.0 litri, benzină, matching numbers.';
    const r = verificaCorelatieBadge('W124', text, 1992);
    expect(r.insignaRevendicata).toBe('500e');
    expect(r.conflicteTehnice).toEqual([]);
  });

  it('nicio insignă revendicată pe un anunț obișnuit', () => {
    const r = verificaCorelatieBadge('W124', 'Mercedes 230E, stare bună, km reali.', 1988);
    expect(r.insignaRevendicata).toBeNull();
    expect(r.conflicteTehnice).toEqual([]);
  });

  it('W123 nu a avut niciodată variantă AMG de fabrică — orice mențiune AMG e suspectă', () => {
    const r = verificaCorelatieBadge('W123', 'Mercedes W123 cu pachet AMG de fabrică, foarte rar.', 1980);
    expect(r.conflicteTehnice.some((c) => c.includes('W123 nu a avut niciodată'))).toBe(true);
  });
});

describe('filtruAntiFalsOutputSchema', () => {
  it('validează un output corect', () => {
    const parsed = filtruAntiFalsOutputSchema.parse({
      autenticitate_pachet: 'Replica',
      alerta_frauda_pret: true,
      nota_explicativa: 'test',
      semnale_detectate: ['test'],
    });
    expect(parsed.autenticitate_pachet).toBe('Replica');
  });

  it('respinge o valoare invalidă pentru autenticitate_pachet', () => {
    expect(() =>
      filtruAntiFalsOutputSchema.parse({
        autenticitate_pachet: 'Fals', // nu e în enum
        alerta_frauda_pret: false,
        nota_explicativa: 'x',
      })
    ).toThrow();
  });
});
