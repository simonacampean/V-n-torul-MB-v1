import Blueprint from '@/components/Blueprint';
import AdSlot from '@/components/AdSlot';
import ModelPhoto from '@/components/ModelPhoto';
import Icon from '@/components/Icon';
import CommunityStats from '@/components/CommunityStats';
import { getTargetModels, galleryUrl, fmt } from '@/lib/models';

export const revalidate = 3600; // conținutul modelelor se schimbă rar

const bodyLabel = { coupe: 'COUPÉ', roadster: 'ROADSTER', sedan: 'SEDAN' } as const;

export default async function Home() {
  const { models } = await getTargetModels();

  return (
    <>
      <main>
        <div className="wrap">
          <p className="tagline">
            Îți spunem, pentru fiecare Mercedes-Benz clasic urmărit, dacă prețul e corect —
            pe bază de date reale, nu presupuneri.
          </p>
          <p className="intro">
            Șase ținte selectate pe criterii de investiție. Regula de aur:{' '}
            <b>cel mai bun exemplar dintr-un model accesibil</b>.
          </p>
          <CommunityStats />

          {models.map((m, i) => (
            <div key={m.code}>
              {i === 2 && <AdSlot position="infeed" />}
            <article className="card">
              <ModelPhoto code={m.code} alt={`${m.name} — fotografie de referință`} />

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
                  Fig. {String(i + 1).padStart(2, '0')} · {bodyLabel[m.body]} · față / lateral / spate
                </span>
                <div className="blueprint-row">
                  <div className="blueprint-col">
                    <Blueprint body={m.body} view="front" />
                    <span className="blueprint-col-label">Față</span>
                  </div>
                  <div className="blueprint-col">
                    <Blueprint body={m.body} view="side" />
                    <span className="blueprint-col-label">Lateral</span>
                  </div>
                  <div className="blueprint-col">
                    <Blueprint body={m.body} view="rear" />
                    <span className="blueprint-col-label">Spate</span>
                  </div>
                </div>
                <a className="gal-block" href={galleryUrl(m)} target="_blank" rel="noopener noreferrer">
                  <Icon name="camera" /> Galerie foto →
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
            </div>
          ))}

          <p className="meta mono" style={{ maxWidth: 760 }}>
            Benzile de preț sunt intervale orientative — aceasta nu este consultanță financiară.
          </p>

          <AdSlot position="footer" />
        </div>
      </main>
    </>
  );
}
