import { fmt } from '@/lib/models';
import { sortedTrendPoints, trendGrowthPct, type TrendPoint } from '@/lib/trends';

interface Props {
  data: TrendPoint[];
  variant?: 'compact' | 'full';
}

/** SVG nativ, fără dependință de librărie de grafice (mirrors PriceSparkline.tsx).
 * Se ascunde complet sub 2 puncte — nu desenăm o "tendință" dintr-un singur an
 * (vezi migrarea 0023: tabelul rămâne gol până se introduc valori reale, sursate). */
export default function ModelTrendChart({ data, variant = 'full' }: Props) {
  const growthPctRaw = trendGrowthPct(data);
  if (growthPctRaw === null) return null;

  const points = sortedTrendPoints(data);
  const prices = points.map((p) => p.pret);
  const first = prices[0];
  const last = prices[prices.length - 1];
  const growthPct = growthPctRaw;
  const rising = last >= first;
  const stroke = rising ? 'var(--green)' : 'var(--amber)';
  const growthLabel = `${growthPct >= 0 ? '+' : ''}${growthPct}%`;
  const ariaLabel = `Tendință de piață ${points[0].an}–${points[points.length - 1].an}: ${growthLabel}, ${points
    .map((p) => `${p.an}: ${p.pret} euro`)
    .join(', ')}`;

  if (variant === 'compact') {
    const W = 120;
    const H = 28;
    const PAD = 3;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const coords = prices.map((p, i) => ({
      x: PAD + (i * (W - 2 * PAD)) / (prices.length - 1),
      y: PAD + ((max - p) * (H - 2 * PAD)) / span,
    }));
    const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={ariaLabel}>
          <polyline points={polyline} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          {coords.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 2.2 : 1.3} fill={stroke} />
          ))}
        </svg>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: stroke }}>
          {growthLabel} / {points[0].an}–{points[points.length - 1].an}
        </span>
      </div>
    );
  }

  const W = 320;
  const H = 110;
  const PAD_X = 20;
  const PAD_Y = 14;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const coords = points.map((p, i) => ({
    x: PAD_X + (i * (W - 2 * PAD_X)) / (points.length - 1),
    y: PAD_Y + ((max - p.pret) * (H - 2 * PAD_Y - 14)) / span,
    ...p,
  }));
  const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <div className="trendchart">
      <div className="row" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div className="seclabel" style={{ marginTop: 0 }}>
          ▸ Tendință de piață ({points[0].an}–{points[points.length - 1].an})
        </div>
        <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: stroke }}>
          {growthLabel} în ultimii {points[points.length - 1].an - points[0].an} ani
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={ariaLabel}>
        <polyline points={polyline} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        {coords.map((c) => (
          <g key={c.an}>
            <circle cx={c.x} cy={c.y} r={3} fill={stroke} />
            <text x={c.x} y={H - 2} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--inksoft)">
              {c.an}
            </text>
          </g>
        ))}
      </svg>
      <div className="meta mono" style={{ marginTop: 2 }}>
        {fmt(first)}–{fmt(last)} € · preț mediu estimat, stare medie (grad 3)
      </div>
    </div>
  );
}
