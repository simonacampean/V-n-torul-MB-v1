import type { PriceHistoryEntry } from '@/lib/scoring';

/**
 * Mini-grafic SVG pentru istoricul de preț al unui anunț urmărit — comunică
 * tendința dintr-o privire, în locul citirii șirului de prețuri. Culoare:
 * verde dacă prețul curent e sub cel inițial (scade — bine pentru cumpărător),
 * gri altfel. Pur, fără dependențe — SVG inline dimensionat de CSS.
 */
export default function PriceSparkline({ history }: { history: PriceHistoryEntry[] }) {
  if (history.length < 2) return null;

  const W = 120;
  const H = 28;
  const PAD = 3;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;

  const points = prices
    .map((p, i) => {
      const x = PAD + (i * (W - 2 * PAD)) / (prices.length - 1);
      const y = PAD + ((max - p) * (H - 2 * PAD)) / span;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const falling = prices[prices.length - 1] < prices[0];
  const stroke = falling ? 'var(--green)' : 'var(--plateedge)';
  const last = points.split(' ').pop()!.split(',');

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`Evoluție preț: de la ${prices[0]} la ${prices[prices.length - 1]} euro`}
    >
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={stroke} />
    </svg>
  );
}
