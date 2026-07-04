import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Vânătorul MB — Investiții Mercedes-Benz clasice';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Culorile „Datenkarte" (design/tokens.css) hardcodate — ImageResponse
// randează izolat, fără acces la variabilele CSS ale paginii.
const INK = '#22262B';
const PLATEEDGE = '#9FA6AE';
const RED = '#B3121B';

// Blueprint-ul coupé (W124/C124) — 1:1 din components/Blueprint.tsx.
const CAR_PATH =
  'M42,104 L48,88 Q52,80 70,78 L128,72 Q186,48 238,50 L286,54 Q326,58 350,74 L372,82 Q382,86 382,95 L382,102 Q382,108 372,108 L344,108 M286,108 L134,108 M76,108 L52,108 Q42,108 42,104 Z';
const GLASS_PATH = 'M142,71 Q192,52 236,53 L280,57 Q308,61 326,72 L142,72 Z';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: INK,
          padding: '64px 72px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 20, letterSpacing: 6, color: PLATEEDGE, textTransform: 'uppercase' }}>
          INVESTIȚII AUTO CLASICE
        </div>
        <div style={{ display: 'flex', fontSize: 78, fontWeight: 800, color: '#FAFBFC', marginTop: 8 }}>
          VÂNĂTORUL <span style={{ color: RED, marginLeft: 20 }}>MB</span>
        </div>
        <div style={{ display: 'flex', marginTop: 48 }}>
          <svg width="760" height="220" viewBox="0 0 420 140">
            <line x1="30" y1="20" x2="30" y2="126" stroke={PLATEEDGE} strokeWidth="0.7" strokeDasharray="2 4" />
            <line x1="390" y1="20" x2="390" y2="126" stroke={PLATEEDGE} strokeWidth="0.7" strokeDasharray="2 4" />
            <line x1="20" y1="130" x2="400" y2="130" stroke={PLATEEDGE} strokeWidth="1" strokeDasharray="4 5" />
            <path d={CAR_PATH} fill="none" stroke="#C9CED4" strokeWidth="2.5" strokeLinejoin="round" />
            <path d={GLASS_PATH} fill="none" stroke="#C9CED4" strokeWidth="1.6" />
            <line x1="46" y1="92" x2="378" y2="92" stroke={RED} strokeWidth="1.4" />
            <circle cx="105" cy="108" r="21" fill="none" stroke="#C9CED4" strokeWidth="2.5" />
            <circle cx="105" cy="108" r="9" fill="none" stroke={PLATEEDGE} strokeWidth="1.5" />
            <circle cx="315" cy="108" r="21" fill="none" stroke="#C9CED4" strokeWidth="2.5" />
            <circle cx="315" cy="108" r="9" fill="none" stroke={PLATEEDGE} strokeWidth="1.5" />
          </svg>
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: '#C9CED4', marginTop: 'auto' }}>
          Modele țintă · Vânătoare zilnică · Evaluator preț-calitate · Alerte de chilipiruri
        </div>
      </div>
    ),
    { ...size }
  );
}
