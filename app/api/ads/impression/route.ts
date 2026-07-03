import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** AD-03 — contorizare afișări pentru raportare către sponsor. Scriere prin admin client (RLS: doar admin). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const campaignId = body?.campaignId;
  if (typeof campaignId !== 'string') {
    return NextResponse.json({ error: 'campaignId lipsă.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: campaign } = await admin.from('ad_campaigns').select('impressions').eq('id', campaignId).single();
  if (!campaign) return NextResponse.json({ error: 'Campanie negăsită.' }, { status: 404 });

  await admin
    .from('ad_campaigns')
    .update({ impressions: campaign.impressions + 1 })
    .eq('id', campaignId);

  return NextResponse.json({ ok: true });
}
