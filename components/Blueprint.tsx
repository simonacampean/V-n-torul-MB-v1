// Ilustrațiile blueprint — portate 1:1 din v5 (bpSvg). Identitatea vizuală a platformei.
import type { Body } from '@/lib/models';

const STROKE = 'var(--inksoft)';
const ACC = 'var(--red)';
const THIN = 'var(--plateedge)';

const SHAPES: Record<Body, { carPath: string; glass: JSX.Element; detail: JSX.Element }> = {
  sedan: {
    carPath: 'M40,104 L46,86 Q50,78 66,76 L118,70 Q168,52 218,52 L280,54 Q322,56 348,72 L372,80 Q382,84 382,94 L382,102 Q382,108 372,108 L344,108 M286,108 L134,108 M76,108 L50,108 Q40,108 40,104 Z',
    glass: (
      <>
        <path d="M130,70 Q170,56 216,56 L268,57 Q300,59 322,70 L262,70 Z" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <line x1="196" y1="55" x2="196" y2="70" stroke={STROKE} strokeWidth="1.6" />
      </>
    ),
    detail: (
      <>
        <line x1="46" y1="90" x2="378" y2="90" stroke={ACC} strokeWidth="1.4" />
        <rect x="42" y="82" width="10" height="5" fill="none" stroke={STROKE} strokeWidth="1.3" />
      </>
    ),
  },
  coupe: {
    carPath: 'M42,104 L48,88 Q52,80 70,78 L128,72 Q186,48 238,50 L286,54 Q326,58 350,74 L372,82 Q382,86 382,95 L382,102 Q382,108 372,108 L344,108 M286,108 L134,108 M76,108 L52,108 Q42,108 42,104 Z',
    glass: (
      <>
        <path d="M142,71 Q192,52 236,53 L280,57 Q308,61 326,72 L142,72 Z" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <line x1="228" y1="53" x2="230" y2="72" stroke={STROKE} strokeWidth="1.6" />
      </>
    ),
    detail: (
      <>
        <line x1="48" y1="92" x2="378" y2="92" stroke={ACC} strokeWidth="1.4" />
        <rect x="44" y="84" width="10" height="5" fill="none" stroke={STROKE} strokeWidth="1.3" />
      </>
    ),
  },
  roadster: {
    carPath: 'M44,104 L50,88 Q54,80 72,78 L150,72 L206,60 Q214,58 224,60 L262,66 L300,70 Q340,74 358,80 L374,86 Q382,90 382,97 L382,102 Q382,108 372,108 L344,108 M286,108 L134,108 M78,108 L54,108 Q44,108 44,104 Z',
    glass: (
      <>
        <path d="M160,72 L206,62 L212,72 Z" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <path d="M226,62 Q238,54 254,56 L250,66" fill="none" stroke={THIN} strokeWidth="1.3" strokeDasharray="3 3" />
      </>
    ),
    detail: (
      <>
        <line x1="50" y1="92" x2="378" y2="92" stroke={ACC} strokeWidth="1.4" />
        <rect x="46" y="84" width="10" height="5" fill="none" stroke={STROKE} strokeWidth="1.3" />
      </>
    ),
  },
};

export default function Blueprint({ body }: { body: Body }) {
  const s = SHAPES[body] ?? SHAPES.sedan;
  return (
    <svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustrație tehnică">
      <line x1="30" y1="20" x2="30" y2="126" stroke={THIN} strokeWidth=".7" strokeDasharray="2 4" />
      <line x1="390" y1="20" x2="390" y2="126" stroke={THIN} strokeWidth=".7" strokeDasharray="2 4" />
      <line x1="20" y1="130" x2="400" y2="130" stroke={THIN} strokeWidth="1" strokeDasharray="4 5" />
      <path d={s.carPath} fill="none" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      {s.glass}
      <circle cx="105" cy="108" r="21" fill="none" stroke={STROKE} strokeWidth="2.5" />
      <circle cx="105" cy="108" r="9" fill="none" stroke={THIN} strokeWidth="1.5" />
      <circle cx="315" cy="108" r="21" fill="none" stroke={STROKE} strokeWidth="2.5" />
      <circle cx="315" cy="108" r="9" fill="none" stroke={THIN} strokeWidth="1.5" />
      {s.detail}
    </svg>
  );
}
