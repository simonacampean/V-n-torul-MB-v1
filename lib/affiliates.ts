// M4 — linkuri de afiliere (carVertical / autoDNA) în fluxul de verificare
// istoric. ID-urile de afiliat vin din env (fără hardcodări în repo); fără
// ele, linkurile duc la paginile publice ale serviciilor — fluxul de
// verificare rămâne funcțional, doar necomisionabil.

export interface AffiliateLink {
  name: string;
  url: string;
}

export function historyCheckLinks(env: {
  carvertical?: string;
  autodna?: string;
} = {
  carvertical: process.env.NEXT_PUBLIC_AFFILIATE_CARVERTICAL,
  autodna: process.env.NEXT_PUBLIC_AFFILIATE_AUTODNA,
}): AffiliateLink[] {
  return [
    {
      name: 'carVertical',
      url: env.carvertical
        ? `https://www.carvertical.com/ro/landing/v3?a=${encodeURIComponent(env.carvertical)}&b=90e623a5`
        : 'https://www.carvertical.com/ro',
    },
    {
      name: 'autoDNA',
      url: env.autodna
        ? `https://www.autodna.ro/?utm_source=affiliate&utm_medium=partner&utm_campaign=${encodeURIComponent(env.autodna)}`
        : 'https://www.autodna.ro',
    },
  ];
}
