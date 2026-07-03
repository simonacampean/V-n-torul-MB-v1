import { describe, it, expect } from 'vitest';
import { pickActiveCampaign, type AdCampaign } from '../lib/ads';

const base: AdCampaign = {
  id: 'a', position: 'banner', mode: 'direct', sponsor_name: 'Sponsor', image_url: 'x.png',
  target_url: 'https://sponsor.test', starts_at: null, ends_at: null, active: true,
};

describe('pickActiveCampaign — AD-03', () => {
  const now = new Date('2026-07-04T12:00:00.000Z');

  it('alege campania directă activă, fără interval de date', () => {
    expect(pickActiveCampaign([base], 'banner', now)?.id).toBe('a');
  });

  it('null (⇒ AdSense) dacă nu există campanie directă pentru acea poziție', () => {
    expect(pickActiveCampaign([base], 'infeed', now)).toBeNull();
  });

  it('null dacă mode=adsense (nu direct)', () => {
    expect(pickActiveCampaign([{ ...base, mode: 'adsense' }], 'banner', now)).toBeNull();
  });

  it('null dacă active=false', () => {
    expect(pickActiveCampaign([{ ...base, active: false }], 'banner', now)).toBeNull();
  });

  it('respectă intervalul starts_at/ends_at', () => {
    const future = { ...base, starts_at: '2026-08-01T00:00:00.000Z' };
    expect(pickActiveCampaign([future], 'banner', now)).toBeNull();

    const expired = { ...base, ends_at: '2026-07-01T00:00:00.000Z' };
    expect(pickActiveCampaign([expired], 'banner', now)).toBeNull();

    const current = { ...base, starts_at: '2026-07-01T00:00:00.000Z', ends_at: '2026-08-01T00:00:00.000Z' };
    expect(pickActiveCampaign([current], 'banner', now)?.id).toBe('a');
  });
});
