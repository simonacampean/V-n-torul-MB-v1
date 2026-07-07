import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runAgent } from '@/lib/agents/orchestrator';
import type { NegociatorInput, NegociatorOutput, PricePoint } from '@/lib/agents/negociator-umbra';
import { recordHeartbeat } from '@/lib/agent-heartbeat';

// Negociatorul din Umbră poate lua peste 30s pe rulările lui (apel Claude cu
// tool-use) — implicitul Vercel (10s pe Hobby) ar tăia rularea la mijloc.
export const maxDuration = 60;

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
  descriere: z.string().trim().min(10).optional(),
});
const bodySchema = z.object({ results: z.array(resultSchema).max(500) });

interface DescriereSnapshot {
  descriere: string;
  at: string;
}

/** Plafon de siguranță: fiecare rulare a Negociatorului din Umbră poate lua
 * 10-50s (apel Claude cu tool-use) — dacă multe anunțuri se schimbă în
 * aceeași rulare (POST), procesarea secvențială le-ar putea depăși pe cele
 * 60s de maxDuration. Restul rămân pur și simplu pentru rularea programată
 * următoare (la 6 ore) — price_history/descriere_history sunt deja
 * actualizate oricum, nimic nu se pierde, doar analiza AI se amână. */
const MAX_NEGOCIERI_PER_RULARE = 3;

/**
 * Actualizează price_history DOAR când prețul chiar s-a schimbat față de
 * ultima valoare cunoscută — altfel istoricul s-ar umple cu intrări zilnice
 * identice, inutile pentru userul care se uită la „istoricul de preț".
 * La fel pentru descriere_history (nou — sursă de date pentru Negociatorul
 * din Umbră). Când preț sau descriere s-au schimbat FAȚĂ de un punct anterior
 * real (nu la prima captură, când n-avem cu ce compara), rulăm best-effort
 * agentul „negociator-umbra" și salvăm rezultatul direct pe rând, ca userul
 * să-l vadă pe cardul din Lista mea fără interogări suplimentare.
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
  let negociereRulata = 0;
  let negociereAmanata = 0;
  let negociereIncercata = 0; // include și eșecurile — plafonul limitează ÎNCERCĂRILE, nu doar succesele

  for (const { id, price, descriere } of parsed.data.results) {
    const { data: item, error: selErr } = await admin
      .from('watchlist_items')
      .select('price, price_history, descriere_history')
      .eq('id', id)
      .maybeSingle();
    if (selErr || !item) {
      skipped++;
      continue;
    }

    const priceHistory: PricePoint[] = Array.isArray(item.price_history) ? item.price_history : [];
    const descriereHistory: DescriereSnapshot[] = Array.isArray(item.descriere_history) ? item.descriere_history : [];
    const lastPrice = priceHistory.length ? priceHistory[priceHistory.length - 1].price : item.price;
    const lastDescriere = descriereHistory.length ? descriereHistory[descriereHistory.length - 1].descriere : null;

    const pretSchimbat = lastPrice !== price;
    const descriereSchimbata = Boolean(descriere) && descriere !== lastDescriere;
    if (!pretSchimbat && !descriereSchimbata) {
      unchanged++;
      continue;
    }

    // Există un punct anterior real de comparat DOAR dacă am mai avut deja
    // cel puțin o valoare cunoscută înainte de rularea asta.
    const areIstoricAnterior = priceHistory.length > 0 || descriereHistory.length > 0;

    const updatedPriceHistory = pretSchimbat ? [...priceHistory, { price, at: todayIso() }] : priceHistory;
    const updatedDescriereHistory = descriereSchimbata
      ? [...descriereHistory, { descriere: descriere!, at: todayIso() }]
      : descriereHistory;

    const updates: Record<string, unknown> = { price_history: updatedPriceHistory, descriere_history: updatedDescriereHistory };
    if (pretSchimbat) updates.price = price;

    const { error } = await admin.from('watchlist_items').update(updates).eq('id', id);
    if (error) {
      skipped++;
      continue;
    }
    updated++;

    if (areIstoricAnterior) {
      if (negociereIncercata >= MAX_NEGOCIERI_PER_RULARE) {
        negociereAmanata++;
        continue;
      }
      negociereIncercata++;

      const negociatorInput: NegociatorInput = {
        descriereAnterioara: lastDescriere,
        descriereCurenta: descriere ?? lastDescriere ?? '',
        priceHistory: updatedPriceHistory,
      };
      const result = await runAgent<NegociatorInput, NegociatorOutput>('negociator-umbra', negociatorInput, {
        triggerSource: 'watchlist_recheck',
        relatedWatchlistItemId: id,
      });
      if (result.ok) {
        negociereRulata++;
        await admin
          .from('watchlist_items')
          .update({
            indice_urgenta_negociere: result.data.indice_urgenta,
            schimbari_cheie_negociere: result.data.schimbari_cheie_detectate,
            strategie_negociere: result.data.strategie_negociere_recomandata,
            negociere_actualizata_la: new Date().toISOString(),
          })
          .eq('id', id);
      }
    }
  }

  await recordHeartbeat(admin, 'watchlist_recheck', {
    itemsPrimite: parsed.data.results.length,
    updated,
    unchanged,
    skipped,
  });

  return NextResponse.json({ ok: true, updated, unchanged, skipped, negociereRulata, negociereAmanata });
}
