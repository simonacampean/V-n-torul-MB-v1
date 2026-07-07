import type { ReactNode } from 'react';
import Icon from './Icon';

/** Stare goală consecventă — o iconiță discretă deasupra textului, în loc de
 * text simplu izolat. Refolosită peste tot unde o listă poate fi goală
 * (Lista mea, moderare, Trend-Scout, publicitate) — vezi .empty în globals.css. */
export default function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name="folder" size={26} />
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}
