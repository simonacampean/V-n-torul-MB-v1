import { describe, it, expect } from 'vitest';
import { renderDigestEmailHtml, renderDigestEmailText, type AlertOfferItem } from '../lib/email/alert-template';

const offer: AlertOfferItem = {
  offerTitle: '300CE-24, Almandinrot',
  modelCode: 'W124',
  score: 91,
  price: 8500,
  totalRo: 10000,
  offerUrl: 'https://x.test/anunt',
  reason: 'excellent',
  fullOptions: true,
  historyVerified: true,
};

describe('renderDigestEmailHtml', () => {
  it('conține titlul, scorul, prețul și linkul spre anunț', () => {
    const html = renderDigestEmailHtml([offer], 'https://vanatorul-mb.vercel.app/dezaboneaza?token=abc');
    expect(html).toContain('300CE-24, Almandinrot');
    expect(html).toContain('91');
    expect(html).toContain('8.500');
    expect(html).toContain('https://x.test/anunt');
    expect(html).toContain('dezaboneaza?token=abc');
  });

  it('escapează HTML din titlu (protecție XSS — SEC-02)', () => {
    const malicious: AlertOfferItem = { ...offer, offerTitle: '<script>alert(1)</script>' };
    const html = renderDigestEmailHtml([malicious], 'https://x.test/unsub');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('titlul e la singular pentru o ofertă, plural pentru mai multe', () => {
    const one = renderDigestEmailHtml([offer], 'https://x.test/u');
    const two = renderDigestEmailHtml([offer, { ...offer, offerTitle: 'a doua ofertă' }], 'https://x.test/u');
    expect(one).toContain('O ofertă nouă');
    expect(two).toContain('2 oferte noi');
  });

  it('include motivul scăderii de preț când reason=price_drop', () => {
    const drop: AlertOfferItem = { ...offer, reason: 'price_drop', dropPct: 12 };
    const html = renderDigestEmailHtml([drop], 'https://x.test/u');
    expect(html).toContain('12%');
    expect(html).toContain('SCĂDERE DE PREȚ');
  });
});

describe('renderDigestEmailText', () => {
  it('generează un fallback text simplu, cu link de dezabonare', () => {
    const text = renderDigestEmailText([offer], 'https://x.test/unsub');
    expect(text).toContain('300CE-24');
    expect(text).toContain('https://x.test/unsub');
  });
});
