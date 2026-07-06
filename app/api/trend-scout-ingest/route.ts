import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runAgent } from '@/lib/agents/orchestrator';
import type { TrendScoutReport, ForumPost } from '@/lib/agents/trend-scout';

// Analiza Trend-Scout pe fereastra de 6 luni poate lua peste 30s — implicitul
// Vercel (10s pe Hobby) ar tăia rularea la mijloc.
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

const postSchema = z.object({
  text: z.string().trim().min(10, 'Fragmentul e prea scurt ca să conțină vreo mențiune reală.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data trebuie în format YYYY-MM-DD.'),
  source: z.string().trim().optional(),
  source_url: z.string().trim().optional(),
});
const bodySchema = z.object({ posts: z.array(postSchema).max(30) });

/** Fereastra de analiză — suficient pentru trenduri lună-peste-lună, fără
 * să lase promptul Trend-Scout să crească nemărginit pe măsură ce se
 * acumulează postări în timp. */
const LUNI_ANALIZATE = 6;

/**
 * Primește fragmente de discuții găsite prin căutare web legitimă (Faza C a
 * rutinei Claude programate — NU scraping sistematic de forumuri, vezi
 * regula legală din SKILL.md). Le stochează în forum_posts, apoi rulează
 * Trend-Scout pe TOT istoricul din fereastra de analiză (nu doar lotul nou),
 * ca variația lună-peste-lună să aibă bază de comparație reală.
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

  let inserted = 0;
  if (parsed.data.posts.length) {
    const { error: insErr, count } = await admin
      .from('forum_posts')
      .insert(
        parsed.data.posts.map((p) => ({
          text: p.text,
          post_date: p.date,
          source: p.source ?? null,
          source_url: p.source_url ?? null,
        })),
        { count: 'exact' }
      );
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    inserted = count ?? parsed.data.posts.length;
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - LUNI_ANALIZATE);
  const { data: istoric, error: selErr } = await admin
    .from('forum_posts')
    .select('text,post_date,source')
    .gte('post_date', cutoff.toISOString().slice(0, 10))
    .order('post_date', { ascending: true });
  if (selErr) {
    return NextResponse.json({ ok: true, inserted, trendRunOk: false, trendRunError: selErr.message });
  }

  const posts: ForumPost[] = (istoric ?? []).map((r) => ({ text: r.text, date: r.post_date, source: r.source ?? undefined }));
  const result = await runAgent<{ posts: ForumPost[] }, TrendScoutReport>(
    'trend-scout',
    { posts },
    { triggerSource: 'forum_ingest' }
  );

  return NextResponse.json({
    ok: true,
    inserted,
    postsAnalizate: posts.length,
    trendRunOk: result.ok,
    trendRunError: result.ok ? undefined : result.error,
  });
}
