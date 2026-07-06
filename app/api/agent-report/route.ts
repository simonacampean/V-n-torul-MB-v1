import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractAgentReport, validateOffers, planOfferImport } from '@/lib/offers';
import { applyImportPlan } from '@/lib/server/offers-import';
import { getTargetModels } from '@/lib/models';

// Auto-import-ul rulează agenți AI (Detectiv + Filtru, uneori Ghidul RAR/Arheologul/
// Calculator) per anunț — poate lua peste 10s; implicitul Vercel (10s pe Hobby) ar
// tăia rularea la mijloc.
export const maxDuration = 60;

/** Plafon de siguranță tehnică: procesăm automat doar primele N anunțuri noi per
 * apel (agenții + gate-ul de siguranță pot lua zeci de secunde per anunț) — restul
 * rămân în draft-ul „pending" pentru aprobare manuală ulterioară (importDraft
 * re-planifică și sare peste ce s-a inserat deja, via fingerprint — nimic nu se pierde). */
const MAX_AUTO_IMPORT_PER_RULARE = 3;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Primește rapoartele generate de rutina Claude programată (skill „schedule").
 * Autorizare prin token bearer (AGENT_REPORT_TOKEN), comparat constant-time.
 *
 * Auto-aprobare (fără admin în buclă): fiecare anunț nou trece prin Detectivul
 * de Autenticitate + Filtru Anti-Fals înainte să devină public — vezi
 * evalueazaGateAutoAprobare() din lib/server/offers-import.ts. Fail-safe
 * conservator: dacă un agent eșuează (fără semnal de siguranță), anunțul NU
 * se auto-aprobă, rămâne „pending" în /admin/oferte pentru un om.
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
  const { data: draftRow, error: draftErr } = await admin
    .from('agent_report_drafts')
    .insert({ generated_at: report.generated ?? null, payload: report, status: 'pending' })
    .select('id')
    .single();
  if (draftErr) {
    return NextResponse.json({ error: draftErr.message }, { status: 500 });
  }

  const { models } = await getTargetModels();
  const { valid, skipped: invalidSkipped } = validateOffers(
    report.offers,
    models.map((m) => m.code)
  );

  const { data: existingOffers } = await admin
    .from('offers')
    .select('id, model_code, year, price, km, url')
    .eq('status', 'active');
  const plan = planOfferImport(valid, existingOffers ?? []);

  const toInsertAcum = plan.toInsert.slice(0, MAX_AUTO_IMPORT_PER_RULARE);
  const deferredForManualReview = plan.toInsert.length - toInsertAcum.length;

  const result = await applyImportPlan(
    admin,
    { toInsert: toInsertAcum, toUpdate: plan.toUpdate },
    null,
    { autoModerate: true }
  );

  // Dacă tot ce era de inserat a fost procesat acum, draftul e complet rezolvat —
  // altfel rămâne „pending", ca un admin să poată aproba manual restul mai târziu.
  if (deferredForManualReview === 0) {
    await admin.from('agent_report_drafts').update({ status: 'imported' }).eq('id', draftRow.id);
  }

  return NextResponse.json({
    ok: true,
    offersReceived: report.offers.length,
    invalidSkipped,
    autoInserted: result.inserted,
    autoApproved: result.autoApproved,
    needsManualReview: result.needsReview,
    deferredForManualReview,
  });
}
