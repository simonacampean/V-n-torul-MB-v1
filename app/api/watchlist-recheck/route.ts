import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function checkAuth(request: NextRequest): boolean {
  const expected = process.env.AGENT_REPORT_TOKEN;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return Boolean(expected && provided && safeEqual(provided, expected));
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Închide bucla dintre rutina Claude programată și Lista mea: GET întoarce
 * link-urile de anunțuri salvate de utilizatori (fără alte date personale —
 * doar id + url, strictul necesar ca agentul să știe ce pagini să revizite),
 * agentul vizitează individual fiecare pagină (permis — nu e scraping de
 * căutare/listare) și trimite prețul curent prin POST.
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('watchlist_items')
    .select('id,url')
    .not('url', 'is', null)
    .neq('status', 'Cumpărat ✓');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

const resultSchema = z.object({
  id: z.string().uuid(),
  price: z.coerce.number().int().positive(),
});
const bodySchema = z.object({ results: z.array(resultSchema).max(500) });

/**
 * Actualizează price_history DOAR când prețul chiar s-a schimbat față de
 * ultima valoare cunoscută — altfel istoricul s-ar umple cu intrări zilnice
 * identice, inutile pentru userul care se uită la „istoricul de preț".
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = createAdminClient();
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const { id, price } of parsed.data.results) {
    const { data: item, error: selErr } = await admin
      .from('watchlist_items')
      .select('price, price_history')
      .eq('id', id)
      .maybeSingle();
    if (selErr || !item) {
      skipped++;
      continue;
    }

    const history = Array.isArray(item.price_history) ? item.price_history : [];
    const lastPrice = history.length ? history[history.length - 1].price : item.price;
    if (lastPrice === price) {
      unchanged++;
      continue;
    }

    const updatedHistory = [...history, { price, at: todayIso() }];
    const { error } = await admin
      .from('watchlist_items')
      .update({ price, price_history: updatedHistory })
      .eq('id', id);
    if (error) {
      skipped++;
      continue;
    }
    updated++;
  }

  return NextResponse.json({ ok: true, updated, unchanged, skipped });
}
