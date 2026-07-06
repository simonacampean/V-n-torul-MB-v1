// Teste pentru partea determinist a Ghidului RAR — gate-ul de vârstă (30 de
// ani) și scurtcircuitele fără apel Claude sunt testabile izolat, fără
// ANTHROPIC_API_KEY.
import { describe, it, expect } from 'vitest';
import { calculeazaVarstaVehicul, ghidRarOutputSchema, ghidRarAgent, type GhidRarInput } from '../lib/agents/ghid-rar';

const anCurent = new Date().getFullYear();

describe('calculeazaVarstaVehicul', () => {
  it('calculează vârsta corect', () => {
    expect(calculeazaVarstaVehicul(anCurent - 35)).toBe(35);
  });

  it('întoarce null când anul nu e cunoscut', () => {
    expect(calculeazaVarstaVehicul(null)).toBeNull();
  });
});

describe('ghidRarAgent.run — scurtcircuite determinist (fără ANTHROPIC_API_KEY)', () => {
  it('vehicul prea tânăr (< 30 ani), FĂRĂ text și fără verdict Filtru ⇒ Neeligibil instant', async () => {
    const input: GhidRarInput = {
      titlu: 'Mercedes W124',
      text: null,
      anFabricatie: anCurent - 10,
    };
    const result = await ghidRarAgent.run(input);
    expect(result.eligibilitate_rar).toBe('Neeligibil');
    expect(result.rezumat_ro).toBeNull();
    expect(result.motiv_eligibilitate).toContain('10 ani');
  });

  // NOTĂ: dacă există text SAU un verdict Filtru Anti-Fals, agentul NU mai scurtcircuitează
  // doar pe baza vârstei — traducerea/rezumatul rămâne util indiferent de eligibilitatea RAR
  // (vezi tests/ghid-rar-integration.test.ts pentru cazul „tânăr + text real, cu cheie API").

  it('vârstă suficientă, dar fără text și fără verdict Filtru ⇒ Incert instant', async () => {
    const input: GhidRarInput = {
      titlu: 'Mercedes W123',
      text: null,
      anFabricatie: anCurent - 40,
    };
    const result = await ghidRarAgent.run(input);
    expect(result.eligibilitate_rar).toBe('Incert');
    expect(result.rezumat_ro).toBeNull();
    expect(result.motiv_eligibilitate).toContain('40 ani');
  });

  it('an necunoscut, fără text și fără verdict Filtru ⇒ Incert instant', async () => {
    const input: GhidRarInput = { titlu: 'Mercedes W126', text: null, anFabricatie: null };
    const result = await ghidRarAgent.run(input);
    expect(result.eligibilitate_rar).toBe('Incert');
    expect(result.motiv_eligibilitate).toMatch(/nu e cunoscut/);
  });
});

describe('ghidRarOutputSchema', () => {
  it('validează un output corect', () => {
    const parsed = ghidRarOutputSchema.parse({
      eligibilitate_rar: 'Eligibil',
      rezumat_ro: 'Rezumat de test.',
      motiv_eligibilitate: 'test',
    });
    expect(parsed.eligibilitate_rar).toBe('Eligibil');
  });

  it('acceptă rezumat_ro null', () => {
    const parsed = ghidRarOutputSchema.parse({
      eligibilitate_rar: 'Incert',
      rezumat_ro: null,
      motiv_eligibilitate: 'test',
    });
    expect(parsed.rezumat_ro).toBeNull();
  });

  it('respinge o valoare invalidă pentru eligibilitate_rar', () => {
    expect(() =>
      ghidRarOutputSchema.parse({ eligibilitate_rar: 'Poate', rezumat_ro: null, motiv_eligibilitate: 'x' })
    ).toThrow();
  });
});

// NOTĂ: cazul „vehicul tânăr + text/verdict Filtru prezent” necesită acum un apel Claude
// real (traducerea rămâne utilă indiferent de eligibilitate) — acoperit live în
// tests/ghid-rar-integration.test.ts, nu ca test unitar izolat.
