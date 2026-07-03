import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTargetModels, fmt } from '@/lib/models';
import { condOf, trCost, offerTotal, EXC_THRESHOLD } from '@/lib/scoring';
import { NEG_LABEL } from '@/lib/hunt';

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
}

export default async function OfertePage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const { model: modelFilter } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { models } = await getTargetModels();

  let query = supabase
    .from('offers')
    .select('id,model_code,title,price,year,km,cond,options,history_verified,negotiability,country,note,url,score,excellent')
    .eq('status', 'active')
    .eq('moderation', 'approved')
    .order('score', { ascending: false })
    .limit(500);
  if (modelFilter && modelFilter !== 'TOATE') query = query.eq('model_code', modelFilter);

  const { data } = await query;
  const offers = (data ?? []) as OfferRow[];

  const byModel = new Map<string, OfferRow[]>();
  offers.forEach((o) => {
    const arr = byModel.get(o.model_code) ?? [];
    if (arr.length < 10) arr.push(o);
    byModel.set(o.model_code, arr);
  });

  const shownModels = modelFilter && modelFilter !== 'TOATE' ? [modelFilter] : models.map((m) => m.code);
  const excTotal = offers.filter((o) => o.excellent).length;

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Top oferte</h1>
      <p style={{ marginTop: 12, color: 'var(--inksoft)', maxWidth: 760 }}>
        Cele mai bune oferte per model, ierarhizate calitate-preț: preț vs stare, dotări (full options),
        istoric verificat, negociabilitate și costul aducerii în țară.
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

      {shownModels.map((code) => {
        const grp = byModel.get(code);
        if (!grp || !grp.length) return null;
        return (
          <div key={code}>
            <div className="seclabel" style={{ marginTop: 16 }}>
              ▸ {code} — top {grp.length}
            </div>
            {grp.map((o, rank) => {
              const isExc = Boolean(user) && o.excellent;
              const tc = trCost(o.country);
              const total = offerTotal(o.price, o.country);
              return (
                <article key={o.id} className={`offer ${isExc ? 'exc' : ''}`}>
                  <span className="rank">
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
                  </div>
                  {o.note && <div style={{ fontSize: 13, color: 'var(--inksoft)', marginTop: 8 }}>{o.note}</div>}
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
    </main>
  );
}
