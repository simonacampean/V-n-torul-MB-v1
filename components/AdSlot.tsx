import { createClient } from '@/lib/supabase/server';
import { pickActiveCampaign, type AdCampaign, type AdPosition } from '@/lib/ads';
import AdImpressionBeacon from './AdImpressionBeacon';

const FALLBACK_LABEL: Record<AdPosition, string> = {
  banner: 'spațiu publicitar · banner',
  infeed: 'spațiu publicitar · in-feed',
  footer: 'spațiu publicitar · subsol',
};

/** AD-03 — slot public: campanie directă dacă există una activă pentru poziție, altfel fallback AdSense (placeholder). */
export default async function AdSlot({ position }: { position: AdPosition }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('ad_campaigns')
    .select('id,position,mode,sponsor_name,image_url,target_url,starts_at,ends_at,active')
    .eq('position', position)
    .eq('active', true);

  const campaign = pickActiveCampaign((data as AdCampaign[]) ?? [], position);

  if (campaign) {
    return (
      <div className={`ad ${position}`} role="complementary" aria-label="Publicitate">
        <AdImpressionBeacon campaignId={campaign.id} />
        <a href={`/api/ads/click/${campaign.id}`} target="_blank" rel="noopener noreferrer sponsored">
          {campaign.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaign.image_url} alt={campaign.sponsor_name ?? 'Publicitate'} />
          ) : (
            campaign.sponsor_name ?? 'Publicitate'
          )}
        </a>
      </div>
    );
  }

  return (
    <div className={`ad ${position}`} role="complementary" aria-label="Publicitate">
      {FALLBACK_LABEL[position]}
    </div>
  );
}
