// Teste unitare pentru gate-ul de siguranță al auto-aprobării — funcție
// pură, testabilă izolat, fără nevoie de Supabase sau ANTHROPIC_API_KEY.
import { describe, it, expect } from 'vitest';
import { evalueazaGateAutoAprobare } from '../lib/server/offers-import';
import type { RaportAutenticitate } from '../lib/agents/detectiv-autenticitate';
import type { FiltruAntiFalsOutput } from '../lib/agents/filtru-anti-fals';

const raport = (scor_risc: number): RaportAutenticitate => ({
  scor_risc,
  puncte_critice_detectate: [],
  intrebari_de_pus_vanzatorului: [],
  limba_originala_detectata: null,
  coduri_extrase: {},
});

const filtru = (autenticitate_pachet: FiltruAntiFalsOutput['autenticitate_pachet']): FiltruAntiFalsOutput => ({
  autenticitate_pachet,
  alerta_frauda_pret: false,
  nota_explicativa: '',
  semnale_detectate: [],
});

describe('evalueazaGateAutoAprobare', () => {
  it('fără text de analizat pentru ambii agenți ⇒ aprobă (nimic suspect posibil)', () => {
    expect(evalueazaGateAutoAprobare({ status: 'fara_text' }, { status: 'fara_text' })).toBe(true);
  });

  it('ambii agenți reușesc, fără nimic suspect ⇒ aprobă', () => {
    expect(
      evalueazaGateAutoAprobare(
        { status: 'succes', data: raport(3) },
        { status: 'succes', data: filtru('Original') }
      )
    ).toBe(true);
  });

  it('risc de autenticitate peste prag ⇒ blochează', () => {
    expect(
      evalueazaGateAutoAprobare(
        { status: 'succes', data: raport(8) },
        { status: 'succes', data: filtru('Original') }
      )
    ).toBe(false);
  });

  it('risc exact la prag (5) ⇒ tot aprobă (doar STRICT peste prag blochează)', () => {
    expect(
      evalueazaGateAutoAprobare(
        { status: 'succes', data: raport(5) },
        { status: 'succes', data: filtru('Original') }
      )
    ).toBe(true);
  });

  it('Filtru Anti-Fals găsește „Replica" ⇒ blochează', () => {
    expect(
      evalueazaGateAutoAprobare(
        { status: 'succes', data: raport(1) },
        { status: 'succes', data: filtru('Replica') }
      )
    ).toBe(false);
  });

  it('Filtru Anti-Fals găsește „Suspicios" ⇒ blochează', () => {
    expect(
      evalueazaGateAutoAprobare(
        { status: 'succes', data: raport(1) },
        { status: 'succes', data: filtru('Suspicios') }
      )
    ).toBe(false);
  });

  it('„Modificat" (recunoscut de vânzător) NU blochează', () => {
    expect(
      evalueazaGateAutoAprobare(
        { status: 'succes', data: raport(1) },
        { status: 'succes', data: filtru('Modificat') }
      )
    ).toBe(true);
  });

  it('Detectivul de Autenticitate eșuează ⇒ fail-safe, blochează (fără semnal de siguranță)', () => {
    expect(
      evalueazaGateAutoAprobare({ status: 'eroare' }, { status: 'succes', data: filtru('Original') })
    ).toBe(false);
  });

  it('Filtru Anti-Fals eșuează ⇒ fail-safe, blochează', () => {
    expect(
      evalueazaGateAutoAprobare({ status: 'succes', data: raport(1) }, { status: 'eroare' })
    ).toBe(false);
  });

  it('ambii agenți eșuează ⇒ blochează', () => {
    expect(evalueazaGateAutoAprobare({ status: 'eroare' }, { status: 'eroare' })).toBe(false);
  });
});
