import { describe, it, expect } from 'vitest';
import { ddmmyyyyToIso, normalizeBackupListings } from '../lib/backup';

const MODEL_CODES = ['W124', 'R129', 'W201', 'W126', 'W123', 'W140'];

describe('ddmmyyyyToIso', () => {
  it('convertește formatul ro-RO din v5 (DD.MM.YYYY) în ISO', () => {
    expect(ddmmyyyyToIso('03.07.2026')).toBe('2026-07-03');
  });
  it('returnează null pentru format necunoscut', () => {
    expect(ddmmyyyyToIso('2026-07-03')).toBeNull();
    expect(ddmmyyyyToIso('nu e o dată')).toBeNull();
  });
});

describe('normalizeBackupListings — respinge fișiere invalide', () => {
  it('respinge un obiect fără listings', () => {
    const result = normalizeBackupListings({}, MODEL_CODES);
    expect('error' in result).toBe(true);
  });
  it('respinge null/undefined', () => {
    expect('error' in (normalizeBackupListings(null, MODEL_CODES) as { error?: string })).toBe(true);
  });
});

describe('normalizeBackupListings — backup v5 legacy (cerință de acceptare M1)', () => {
  // Formatul exact exportat de v5 (A.exportData): listings cu model/crit/priceHist,
  // date în ro-RO (DD.MM.YYYY).
  const v5Backup = {
    listings: [
      {
        id: '1751500000000',
        model: 'W124',
        title: '300CE-24, Almandinrot, 138.000 km',
        price: '8500',
        url: 'https://suchen.mobile.de/anunt-123',
        year: '1992',
        km: '138000',
        note: 'Vânzător privat, DE',
        cond: '2',
        status: 'De urmărit',
        crit: { service: true, original: true, km: false },
        added: '01.07.2026',
        priceHist: [
          { p: 9000, d: '01.07.2026' },
          { p: 8500, d: '02.07.2026' },
        ],
      },
    ],
    lastHunt: '03.07.2026',
    exported: '03.07.2026',
    app: 'VanatorulMB',
  };

  it('mapează corect câmpurile v5 (model→model_code, crit→criteria, priceHist→price_history)', () => {
    const result = normalizeBackupListings(v5Backup, MODEL_CODES);
    if ('error' in result) throw new Error('nu ar trebui să eșueze');
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];
    expect(row.model_code).toBe('W124');
    expect(row.title).toBe('300CE-24, Almandinrot, 138.000 km');
    expect(row.price).toBe(8500);
    expect(row.year).toBe(1992);
    expect(row.km).toBe(138000);
    expect(row.cond).toBe('2');
    expect(row.status).toBe('De urmărit');
    expect(row.criteria).toEqual({ service: true, original: true, km: false });
    expect(row.price_history).toEqual([
      { price: 9000, at: '2026-07-01' },
      { price: 8500, at: '2026-07-02' },
    ]);
    expect(row.created_at).toBe('2026-07-01T00:00:00.000Z');
  });

  it('respinge un rând cu model necunoscut, dar continuă cu restul', () => {
    const mixed = {
      listings: [
        { model: 'NECUNOSCUT', title: 'test', price: '1000', cond: '2' },
        { model: 'W124', title: 'valid', price: '9000', cond: '2' },
      ],
    };
    const result = normalizeBackupListings(mixed, MODEL_CODES);
    if ('error' in result) throw new Error('nu ar trebui să eșueze la nivel de fișier');
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/model necunoscut/);
  });

  it('fallback la status "Nou" și cond "2" pentru valori nerecunoscute', () => {
    const backup = { listings: [{ model: 'W124', title: 'test', status: 'CevaCiudat', cond: '9' }] };
    const result = normalizeBackupListings(backup, MODEL_CODES);
    if ('error' in result) throw new Error('nu ar trebui să eșueze');
    expect(result.rows[0].status).toBe('Nou');
    expect(result.rows[0].cond).toBe('2');
  });
});

describe('normalizeBackupListings — format propriu (round-trip export → import)', () => {
  it('acceptă formatul propriu (model_code/criteria/price_history) fără modificări', () => {
    const own = {
      listings: [
        {
          model_code: 'R129',
          title: 'SL500 verde',
          price: 15000,
          url: null,
          year: 1995,
          km: 90000,
          note: null,
          cond: '1',
          status: 'Ofertă făcută',
          criteria: { tehnic: true },
          price_history: [{ price: 15000, at: '2026-06-01' }],
          created_at: '2026-06-01T10:00:00.000Z',
        },
      ],
    };
    const result = normalizeBackupListings(own, MODEL_CODES);
    if ('error' in result) throw new Error('nu ar trebui să eșueze');
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]).toMatchObject({
      model_code: 'R129',
      price: 15000,
      cond: '1',
      status: 'Ofertă făcută',
      criteria: { tehnic: true },
      created_at: '2026-06-01T10:00:00.000Z',
    });
  });
});
