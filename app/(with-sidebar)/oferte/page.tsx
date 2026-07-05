import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getTargetModels, fmt } from '@/lib/models';
import { condOf, trCost, offerTotal, EXC_THRESHOLD } from '@/lib/scoring';
import { NEG_LABEL } from '@/lib/hunt';
import { historyCheckLinks } from '@/lib/affiliates';
import AdSlot from '@/components/AdSlot';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}): Promise<Metadata> {
  const { model } = await searchParams;
  const title = model && model !== 'TOATE' ? `Top oferte ${model} — Vânătorul MB` : 'Top oferte — Vânătorul MB';
  const description =
    'Cele mai bune oferte de Mercedes-Benz clasice, ierarhizate calitate-preț: preț vs stare, dotări, istoric verificat, negociabilitate și cost de aducere în România.';
  return { title, description, robots: { index: true, follow: true } };
}

interface OfferRow {
  id: string;
  model_code: string;
  title: string;
  price: number;
  year: number | null;
  km: number | null;
  cond: string;
  options: string;
  history_verified: boolean;
  negotiability: 'DA' | 'PARTIAL' | 'NU';
  country: string;
  note: string | null;
  url: string | null;
  score: number;
  excellent: boolean;
  first_seen: string;
  last_seen: string;
}

/** P6 — urgență pe date reale: zile de când oferta e urmărită de agent. */
function daysAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

const SORTS = {
  scor: { column: 'score', ascending: false, label: 'Scor (desc.)' },
  pret: { column: 'price', ascending: true, label: 'Preț (cresc.)' },
  an: { column: 'year', ascending: false, label: 'An (desc.)' },
} as const;
type SortKey = keyof typeof SORTS;

export default async function OfertePage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string; pret_max?: string; tara?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const modelFilter = params.model;
  const pretMax = Number.parseInt(params.pret_max ?? '', 10) || null;
  const taraFilter = params.tara && /^[A-Z]{2}$/.test(params.tara) ? params.tara : null;
  const sortKey: SortKey = params.sort && params.sort in SORTS ? (params.sort as SortKey) : 'scor';
  const sort = SORTS[sortKey];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { models } = await getTargetModels();

  let query = supabase
    .from('offers')
    .select('id,model_code,title,price,year,km,cond,options,history_verified,negotiability,country,note,url,score,excellent,first_seen,last_seen')
    .eq('status', 'active')
    .eq('moderation', 'approved')
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .limit(500);
  if (modelFilter && modelFilter !== 'TOATE') query = query.eq('model_code', modelFilter);
  if (pretMax) query = query.lte('price', pretMax);
  if (taraFilter) query = query.eq('country', taraFilter);

  // Țările disponibile pentru filtru — din toate ofertele active, nu doar cele
  // deja filtrate (altfel filtrul s-ar restrânge singur după prima aplicare).
  const [{ data }, { data: countryRows }] = await Promise.all([
    query,
    supabase.from('offers').select('country').eq('status', 'active').eq('moderation', 'approved').limit(1000),
  ]);
  const offers = (data ?? []) as OfferRow[];
  const countries = [...new Set((countryRows ?? []).map((r) => r.country).filter(Boolean))].sort();

  const byModel = new Map<string, OfferRow[]>();
  offers.forEach((o) => {
    const arr = byModel.get(o.model_code) ?? [];
    if (arr.length < 10) arr.push(o);
    byModel.set(o.model_code, arr);
  });

  const shownModels = modelFilter && modelFilter !== 'TOATE' ? [modelFilter] : models.map((m) => m.code);
  const excTotal = offers.filter((o) => o.excellent).length;
  const vinLinks = historyCheckLinks();
  // P6 — ancoră de preț: banda „corectă" a modelului, afișată lângă fiecare ofertă.
  const bandOf = new Map(models.map((m) => [m.code, { lo: m.band_lo, hi: m.band_hi }]));

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Top oferte</h1>
      <p style={{ marginTop: 12, color: 'var(--inksoft)', maxWidth: 760 }}>
        Cele mai bune oferte per model, ierarhizate calitate-preț: preț vs stare, dotări (full options),
        istoric verificat, negociabilitate și costul aducerii în țară.
      </p>
      {/* P2 — credibilitate: disclaimerul chiar lângă preț, nu doar pe homepage. */}
      <p className="disclaimer mono">
        Scorurile și benzile de preț sunt orientative, calculate din date publice — nu reprezintă
        consultanță financiară. Verifică mereu mașina și istoricul înainte de plată.
      </p>

      <div className="meta mono" style={{ marginTop: 12, marginBottom: 8 }}>
        {offers.length} oferte
        {user && (
          <>
            {' · '}
            <span style={{ color: 'var(--green)' }}>
              {excTotal} excelente (scor ≥ {EXC_THRESHOLD})
            </span>
          </>
        )}
      </div>

      <div className="modelbtns">
        <Link href="/oferte" className={!modelFilter || modelFilter === 'TOATE' ? 'on' : ''}>
          Toate
        </Link>
        {models.map((m) => (
          <Link key={m.code} href={`/oferte?model=${m.code}`} className={modelFilter === m.code ? 'on' : ''}>
            {m.code}
          </Link>
        ))}
      </div>

      {/* Filtrare server-side prin GET — funcționează și fără JavaScript. */}
      <form method="get" action="/oferte" className="toolbar">
        {modelFilter && <input type="hidden" name="model" value={modelFilter} />}
        <input
          type="number"
          inputMode="numeric"
          name="pret_max"
          placeholder="Preț maxim (€)"
          min={0}
          step={500}
          defaultValue={pretMax ?? ''}
          aria-label="Preț maxim în euro"
        />
        <select name="tara" defaultValue={taraFilter ?? ''} aria-label="Filtrează după țară">
          <option value="">Toate țările</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sortKey} aria-label="Sortare">
          {Object.entries(SORTS).map(([key, s]) => (
            <option key={key} value={key}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn dark">
          Filtrează
        </button>
      </form>
      {(pretMax || taraFilter || sortKey !== 'scor') && (
        <p className="meta mono" style={{ marginBottom: 12 }}>
          <Link href={modelFilter ? `/oferte?model=${modelFilter}` : '/oferte'}>× Resetează filtrele</Link>
        </p>
      )}

      {!offers.length && (
        <div className="empty">
          Nicio ofertă încă.
          {user && (
            <>
              <br />
              <br />
              <Link href="/cont/oferte/import">Importă raportul agentului →</Link>
            </>
          )}
        </div>
      )}

      {shownModels.map((code, gi) => {
        const grp = byModel.get(code);
        if (!grp || !grp.length) return null;
        return (
          <div key={code}>
            {gi === 1 && <AdSlot position="infeed" />}
            <div className="seclabel" style={{ marginTop: 16 }}>
              ▸ {code} — top {grp.length}
            </div>
            {grp.map((o, rank) => {
              const isExc = Boolean(user) && o.excellent;
              const tc = trCost(o.country);
              const total = offerTotal(o.price, o.country);
              const band = bandOf.get(o.model_code);
              const daysOnMarket = daysAgo(o.first_seen);
              const updatedDays = daysAgo(o.last_seen);
              return (
                <article key={o.id} className={`offer ${isExc ? 'exc' : ''}`}>
                  <span className={`rank ${isExc ? 'pulse' : ''}`}>
                    #{rank + 1}
                    {isExc ? ' · EXCELENTĂ' : ''}
                  </span>
                  <div className="row" style={{ paddingRight: 70 }}>
                    <div>
                      <b style={{ fontSize: 14 }}>{o.title}</b>
                      <div className="meta mono">
                        {[
                          `${fmt(o.price)} €`,
                          o.year,
                          o.km && `${fmt(o.km)} km`,
                          condOf(o.cond).label.split(' — ')[0],
                          o.country,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                      {band && (
                        <div className="meta mono" style={{ marginTop: 2 }}>
                          bandă model: {fmt(band.lo)}–{fmt(band.hi)} €
                        </div>
                      )}
                    </div>
                    <div className="oscore" style={{ color: isExc ? 'var(--green)' : o.score >= 65 ? 'var(--amber)' : 'var(--inksoft)' }}>
                      {o.score}
                      <small>/100</small>
                    </div>
                  </div>
                  <div className="obadges">
                    {o.options === 'full' && <span className="ob full">FULL OPTIONS</span>}
                    {o.history_verified && <span className="ob hist">✓ ISTORIC VERIFICAT</span>}
                    <span className="ob">{NEG_LABEL[o.negotiability]}</span>
                    <span className="ob">aducere: {tc === 0 ? '— (RO)' : `${fmt(tc)} €`}</span>
                    {total != null && (
                      <span className="ob">
                        la cheie: <b>{fmt(total)} €</b>
                      </span>
                    )}
                    <span className="ob">
                      pe piață de {daysOnMarket === 0 ? 'azi' : `${daysOnMarket} zile`}
                    </span>
                    <span className="ob">
                      actualizat {updatedDays === 0 ? 'azi' : `acum ${updatedDays} zile`}
                    </span>
                  </div>
                  {o.note && <div style={{ fontSize: 13, color: 'var(--inksoft)', marginTop: 8 }}>{o.note}</div>}
                  {!o.history_verified && (
                    <div className="vinlinks mono">
                      Verifică istoricul (raport VIN, ~20–30 €):{' '}
                      {vinLinks.map((l, li) => (
                        <span key={l.name}>
                          {li > 0 && ' · '}
                          <a href={l.url} target="_blank" rel="noopener noreferrer sponsored">
                            {l.name} ↗
                          </a>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="obreak">scor: preț/stare + dotări + istoric + negociere + aducere + km</div>
                  {o.url && (
                    <div className="btnrow">
                      <a className="btn primary" style={{ textDecoration: 'none' }} href={o.url} target="_blank" rel="noopener noreferrer">
                        Deschide anunțul ↗
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        );
      })}

      <AdSlot position="footer" />
    </main>
  );
}
