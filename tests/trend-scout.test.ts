// Teste pentru partea determinist-testabilă a Trend-Scout — text_parser,
// keyword_counter și calculul variației procentuale lună-peste-lună, toate
// fără apel API (fără cheie Anthropic necesară).
import { describe, it, expect } from 'vitest';
import { textParser, keywordCounter, computeMonthlyTrends, trendScoutReportSchema } from '../lib/agents/trend-scout';

describe('textParser', () => {
  it('fragmentează o postare în propoziții separate', () => {
    const fragments = textParser([{ text: 'Am cumpărat un W124. Este superb. Rugina e minimă.', date: '2026-06-10' }]);
    expect(fragments.length).toBe(3);
    expect(fragments[0].month).toBe('2026-06');
  });

  it('elimină URL-uri și linii de citat', () => {
    const fragments = textParser([
      { text: '> cineva a zis ceva\nVerifică https://exemplu.com/anunt pentru poze. Mașina arată bine.', date: '2026-06-01' },
    ]);
    const tot = fragments.map((f) => f.text).join(' ');
    expect(tot).not.toContain('https://');
    expect(tot).not.toContain('cineva a zis');
  });

  it('păstrează sursa și data per fragment', () => {
    const fragments = textParser([{ text: 'Salut tuturor.', date: '2026-05-20', source: 'forum-x' }]);
    expect(fragments[0].source).toBe('forum-x');
    expect(fragments[0].date).toBe('2026-05-20');
  });
});

describe('keywordCounter', () => {
  it('numără mențiunile unui model prin alias-uri colocviale (nu doar codul de șasiu)', () => {
    const fragments = textParser([
      { text: 'Vand un 300CE superb.', date: '2026-06-01' },
      { text: 'Cine mai are un W124 coupe de vanzare?', date: '2026-06-05' },
      { text: 'Nimic legat de mașini clasice aici.', date: '2026-06-10' },
    ]);
    const counts = keywordCounter(fragments, ['W124']);
    expect(counts.W124['2026-06']).toBe(2);
  });

  it('separă mențiunile pe luni diferite', () => {
    const fragments = textParser([
      { text: 'Un SL500 frumos.', date: '2026-05-15' },
      { text: 'Alt SL500 de vanzare.', date: '2026-06-15' },
      { text: 'Si inca un SL 500.', date: '2026-06-20' },
    ]);
    const counts = keywordCounter(fragments, ['R129']);
    expect(counts.R129['2026-05']).toBe(1);
    expect(counts.R129['2026-06']).toBe(2);
  });

  it('nu confundă modele diferite cu alias-uri similare', () => {
    const fragments = textParser([{ text: 'Am un W140 S600 de vanzare, nu un W126.', date: '2026-06-01' }]);
    const counts = keywordCounter(fragments, ['W140', 'W126']);
    expect(counts.W140['2026-06']).toBe(1);
    expect(counts.W126['2026-06']).toBe(1); // menționează explicit "W126" — corect numărat și el
  });
});

describe('computeMonthlyTrends', () => {
  it('calculează variația procentuală corectă lună-peste-lună', () => {
    const trends = computeMonthlyTrends({ W124: { '2026-05': 10, '2026-06': 13 } });
    expect(trends[0].variatie_procentuala).toBe(30);
  });

  it('întoarce null pentru variație când nu există lună precedentă', () => {
    const trends = computeMonthlyTrends({ W124: { '2026-06': 5 } });
    expect(trends[0].variatie_procentuala).toBeNull();
    expect(trends[0].luna_precedenta).toBeNull();
  });

  it('ia ultimele 2 luni cu date, nu lunile calendaristice curente', () => {
    const trends = computeMonthlyTrends({ W124: { '2025-01': 4, '2025-03': 8 } });
    expect(trends[0].luna_curenta).toBe('2025-03');
    expect(trends[0].luna_precedenta).toBe('2025-01');
    expect(trends[0].variatie_procentuala).toBe(100);
  });

  it('gestionează scădere (variație negativă)', () => {
    const trends = computeMonthlyTrends({ W201: { '2026-05': 20, '2026-06': 15 } });
    expect(trends[0].variatie_procentuala).toBe(-25);
  });
});

describe('trendScoutReportSchema', () => {
  it('acceptă un raport valid', () => {
    const parsed = trendScoutReportSchema.parse({
      raport: [
        {
          model_detectat: 'W124',
          directie_trend: 'crescator',
          sentiment_net: 'pozitiv',
          argumente_din_discutii: 'Mai mulți utilizatori laudă fiabilitatea și discută restaurări recente.',
          mentiuni_luna_curenta: 13,
          mentiuni_luna_precedenta: 10,
          variatie_procentuala: 30,
          alerta_declansata: true,
        },
      ],
    });
    expect(parsed.raport).toHaveLength(1);
  });

  it('respinge o direcție de trend necunoscută', () => {
    expect(() =>
      trendScoutReportSchema.parse({
        raport: [
          {
            model_detectat: 'W124',
            directie_trend: 'exploziv',
            sentiment_net: 'pozitiv',
            argumente_din_discutii: 'x',
            mentiuni_luna_curenta: 1,
            mentiuni_luna_precedenta: 1,
            variatie_procentuala: 0,
            alerta_declansata: false,
          },
        ],
      })
    ).toThrow();
  });
});
