// Teste pentru partea fără apel API — regexVinMatcher e pur TypeScript,
// testabil izolat; schema zod verifică validarea output-ului agentului.
import { describe, it, expect } from 'vitest';
import { regexVinMatcher, raportAutenticitateSchema } from '../lib/agents/detectiv-autenticitate';

describe('regexVinMatcher', () => {
  it('extrage un VIN ISO standard (17 caractere)', () => {
    const r = regexVinMatcher('VIN: WDB1240501A123456, restul detaliilor...');
    expect(r.vin_iso).toContain('WDB1240501A123456');
  });

  it('extrage un cod de șasiu Mercedes clasic', () => {
    const r = regexVinMatcher('Cod șasiu 124.023-12-345678, motor sănătos.');
    expect(r.mercedes_chassis_code).toContain('124.023-12-345678');
  });

  it('extrage un Motornummer etichetat (german)', () => {
    const r = regexVinMatcher('Motornummer: 110988-12-004567, matching numbers confirmat.');
    expect(r.labeled_engine_number).toContain('110988-12-004567');
  });

  it('extrage un chassis number etichetat (englez)', () => {
    const r = regexVinMatcher('Chassis number: 123.020-10-987654 verified by marque specialist.');
    expect(r.labeled_chassis_number).toContain('123.020-10-987654');
  });

  it('text fără coduri întoarce liste goale', () => {
    const r = regexVinMatcher('Mașină frumoasă, fără detalii tehnice specifice.');
    expect(r.vin_iso).toEqual([]);
    expect(r.mercedes_chassis_code).toEqual([]);
    expect(r.labeled_chassis_number).toEqual([]);
    expect(r.labeled_engine_number).toEqual([]);
  });

  it('găsește ambele coduri în același text', () => {
    const r = regexVinMatcher('Fahrgestellnummer: XYZ987654321, Motornummer: 110988-12-004567.');
    expect(r.labeled_chassis_number.length).toBeGreaterThanOrEqual(1);
    expect(r.labeled_engine_number.length).toBeGreaterThanOrEqual(1);
  });
});

describe('raportAutenticitateSchema', () => {
  it('acceptă un raport valid, complet', () => {
    const parsed = raportAutenticitateSchema.parse({
      scor_risc: 7,
      puncte_critice_detectate: [
        { categorie: 'vopsea_restaurare', descriere: 'contradicție găsită', severitate: 'ridicata' },
      ],
      intrebari_de_pus_vanzatorului: ['Confirmați vopseaua originală?'],
      limba_originala_detectata: 'de',
      coduri_extrase: { vin_iso: [] },
    });
    expect(parsed.scor_risc).toBe(7);
  });

  it('respinge un scor în afara intervalului 1-10', () => {
    expect(() =>
      raportAutenticitateSchema.parse({
        scor_risc: 11,
        puncte_critice_detectate: [],
        intrebari_de_pus_vanzatorului: [],
      })
    ).toThrow();
  });

  it('respinge o categorie necunoscută', () => {
    expect(() =>
      raportAutenticitateSchema.parse({
        scor_risc: 5,
        puncte_critice_detectate: [{ categorie: 'ceva_inventat', descriere: 'x', severitate: 'medie' }],
        intrebari_de_pus_vanzatorului: [],
      })
    ).toThrow();
  });

  it('acceptă un raport minimal (fără puncte critice, scor mic)', () => {
    const parsed = raportAutenticitateSchema.parse({
      scor_risc: 1,
      puncte_critice_detectate: [],
      intrebari_de_pus_vanzatorului: [],
    });
    expect(parsed.puncte_critice_detectate).toEqual([]);
  });
});
