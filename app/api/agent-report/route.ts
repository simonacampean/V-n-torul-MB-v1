import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractAgentReport } from '@/lib/offers';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Primește rapoartele generate de rutina Claude programată (skill „schedule").
 * NU importă direct — stochează doar ca draft „pending"; un admin aprobă
 * explicit din /admin/oferte. Autorizare prin token bearer (AGENT_REPORT_TOKEN),
 * comparat constant-time.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.AGENT_REPORT_TOKEN;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || !provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const bodyText = await request.text();
  const report = extractAgentReport(bodyText);
  if ('error' in report) {
    return NextResponse.json({ error: report.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('agent_report_drafts').insert({
    generated_at: report.generated ?? null,
    payload: report,
    status: 'pending',
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, offersReceived: report.offers.length });
}
