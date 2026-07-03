import { describe, it, expect } from 'vitest';
import { historyCheckLinks } from '../lib/affiliates';

describe('historyCheckLinks — linkuri afiliere verificare istoric (M4)', () => {
  it('fără ID-uri de afiliat ⇒ paginile publice (flux funcțional, necomisionabil)', () => {
    const links = historyCheckLinks({});
    expect(links.map((l) => l.name)).toEqual(['carVertical', 'autoDNA']);
    expect(links[0].url).toBe('https://www.carvertical.com/ro');
    expect(links[1].url).toBe('https://www.autodna.ro');
  });

  it('cu ID-uri de afiliat ⇒ URL-uri cu parametrii de tracking', () => {
    const links = historyCheckLinks({ carvertical: 'vanatorul-mb', autodna: 'vanatorul_mb' });
    expect(links[0].url).toContain('a=vanatorul-mb');
    expect(links[1].url).toContain('utm_campaign=vanatorul_mb');
  });

  it('ID-urile se URL-encodează (nu se pot injecta parametri)', () => {
    const links = historyCheckLinks({ carvertical: 'x&evil=1' });
    expect(links[0].url).toContain('a=x%26evil%3D1');
    expect(links[0].url).not.toContain('evil=1&');
  });
});
