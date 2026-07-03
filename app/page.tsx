import Blueprint from '@/components/Blueprint';
import { getTargetModels, galleryUrl, fmt } from '@/lib/models';

export const revalidate = 3600; // conținutul modelelor se schimbă rar

const bodyLabel = { coupe: 'COUPÉ', roadster: 'ROADSTER', sedan: 'SEDAN' } as const;

export default async function Home() {
  const { models } = await getTargetModels();

  return (
    <>
      <main>
        <div className="wrap">
          <p className="intro">
            Șase ținte selectate pe criterii de investiție. Regula de aur:{' '}
            <b>cel mai bun exemplar dintr-un model accesibil</b>.
          </p>

          {models.map((m, i) => (
            <article className="card" key={m.code}>
              <div className="row">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="plate">{m.code}</span>
                  <div>
                    <div className="mname">{m.name}</div>
                    <div className="meta mono">
                      {m.years}
                      {m.prod_note ? ` · ${m.prod_note}` : ''}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="band mono">
                    preț corect (#2): {fmt(m.band_lo)}–{fmt(m.band_hi)} €
                  </div>
                </div>
              </div>

              <div className="blueprint">
                <span className="bp-label">
                  Fig. {String(i + 1).padStart(2, '0')} · {bodyLabel[m.body]} · profil
                </span>
                <Blueprint body={m.body} />
                <a className="gal" href={galleryUrl(m)} target="_blank" rel="noopener noreferrer">
                  📷 Galerie foto →
                </a>
              </div>

              <p className="thesis">{m.thesis}</p>

              <div className="tags">
                {m.tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>

              <div className="fisa">
                <div className="seclabel">▸ Ce verifici la inspecție</div>
                <ul>
                  {m.checklist.map((c, j) => (
                    <li key={j}>
                      <span className="num">{String(j + 1).padStart(2, '0')}</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <div className="verdict">
                  <b>VERDICT:</b> {m.verdict}
                </div>
              </div>
            </article>
          ))}

          <p className="meta mono" style={{ maxWidth: 760 }}>
            Benzile de preț sunt intervale orientative — aceasta nu este consultanță financiară.
          </p>
        </div>
      </main>

      <footer className="site">
        <div className="wrap">
          <div className="in">
            VÂNĂTORUL MB v2.0 · platformă pentru pasionații de Mercedes clasice
          </div>
        </div>
      </footer>
    </>
  );
}
