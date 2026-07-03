import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** AD-03 — contorizare click + redirect către link-ul real al sponsorului. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from('ad_campaigns')
    .select('clicks, target_url')
    .eq('id', id)
    .single();

  if (!campaign?.target_url) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  await admin.from('ad_campaigns').update({ clicks: campaign.clicks + 1 }).eq('id', id);

  return NextResponse.redirect(campaign.target_url);
}
