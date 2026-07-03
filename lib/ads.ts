// AD-03 — modulul de publicitate: per poziție se alege AdSense (fallback,
// mod implicit) sau o campanie directă (imagine + link + interval de
// afișare), cu contorizare de afișări/clickuri pentru raportare către sponsor.

export type AdPosition = 'banner' | 'infeed' | 'footer';

export interface AdCampaign {
  id: string;
  position: AdPosition;
  mode: 'adsense' | 'direct';
  sponsor_name: string | null;
  image_url: string | null;
  target_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

/**
 * Alege campania directă activă pentru o poziție, dacă există una validă la
 * momentul curent (în intervalul starts_at/ends_at, dacă sunt setate).
 * Altfel null ⇒ pagina afișează AdSense (fallback implicit).
 */
export function pickActiveCampaign(
  campaigns: AdCampaign[],
  position: AdPosition,
  now: Date = new Date()
): AdCampaign | null {
  const candidates = campaigns.filter((c) => {
    if (c.position !== position || c.mode !== 'direct' || !c.active) return false;
    if (c.starts_at && new Date(c.starts_at) > now) return false;
    if (c.ends_at && new Date(c.ends_at) < now) return false;
    return true;
  });
  return candidates[0] ?? null;
}
