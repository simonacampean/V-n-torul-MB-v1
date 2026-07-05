// Ilustrațiile blueprint — vederea laterală portată 1:1 din v5 (bpSvg, identitatea
// vizuală a platformei); vederile față/spate sunt adăugate în același stil (contur
// tehnic monocrom, linii de referință punctate), pe tip de caroserie.
import type { Body } from '@/lib/models';

const STROKE = 'var(--inksoft)';
const ACC = 'var(--red)';
const THIN = 'var(--plateedge)';

export type CarView = 'front' | 'side' | 'rear';

const SIDE_SHAPES: Record<Body, { carPath: string; glass: JSX.Element; detail: JSX.Element }> = {
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

function SideFigure({ body }: { body: Body }) {
  const s = SIDE_SHAPES[body] ?? SIDE_SHAPES.sedan;
  return (
    <svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vedere laterală">
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

// ============================================================
// Vederi față/spate — canvas comun 0 0 200 170, simetric pe x=100.
// ============================================================
interface EndShape {
  body: string; // conturul caroseriei (simetric)
  glass: JSX.Element; // parbriz/lunetă + ștergătoare sau linie mediană
  lamps: JSX.Element; // faruri (față) / stopuri (spate)
  centerpiece: JSX.Element; // grilă (față) / portbagaj+numă (spate)
  mirrorsOrExhaust: JSX.Element;
}

const FRONT_SHAPES: Record<Body, EndShape> = {
  sedan: {
    body: 'M58,44 Q100,36 142,44 L150,62 Q158,70 158,84 L176,98 Q182,106 182,118 L180,138 Q179,142 174,142 L26,142 Q21,142 20,138 L18,118 Q18,106 24,98 L42,84 Q42,70 50,62 Z',
    glass: (
      <>
        <path d="M64,45 Q100,38 136,45 L142,60 L58,60 Z" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <line x1="88" y1="50" x2="82" y2="59" stroke={THIN} strokeWidth="1" />
        <line x1="112" y1="50" x2="118" y2="59" stroke={THIN} strokeWidth="1" />
      </>
    ),
    lamps: (
      <>
        <rect x="26" y="90" width="20" height="12" rx="2" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <rect x="154" y="90" width="20" height="12" rx="2" fill="none" stroke={STROKE} strokeWidth="1.6" />
      </>
    ),
    centerpiece: (
      <>
        <rect x="76" y="92" width="48" height="30" rx="2" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <line x1="76" y1="100" x2="124" y2="100" stroke={THIN} strokeWidth="1" />
        <line x1="76" y1="107" x2="124" y2="107" stroke={THIN} strokeWidth="1" />
        <line x1="76" y1="114" x2="124" y2="114" stroke={THIN} strokeWidth="1" />
        <circle cx="100" cy="86" r="4" fill="none" stroke={ACC} strokeWidth="1.3" />
        <rect x="86" y="130" width="28" height="7" fill="none" stroke={THIN} strokeWidth="1" />
      </>
    ),
    mirrorsOrExhaust: (
      <>
        <path d="M42,82 Q34,80 32,86 Q31,90 38,90" fill="none" stroke={STROKE} strokeWidth="1.4" />
        <path d="M158,82 Q166,80 168,86 Q169,90 162,90" fill="none" stroke={STROKE} strokeWidth="1.4" />
      </>
    ),
  },
  coupe: {
    body: 'M62,50 Q100,42 138,50 L148,64 Q156,72 156,84 L174,98 Q181,106 181,118 L179,138 Q178,142 173,142 L27,142 Q22,142 21,138 L19,118 Q19,106 26,98 L44,84 Q44,72 52,64 Z',
    glass: (
      <>
        <path d="M68,51 Q100,44 132,51 L140,63 L60,63 Z" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <line x1="100" y1="46" x2="100" y2="62" stroke={THIN} strokeWidth="1" />
      </>
    ),
    lamps: (
      <>
        <ellipse cx="36" cy="96" rx="11" ry="7" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <ellipse cx="164" cy="96" rx="11" ry="7" fill="none" stroke={STROKE} strokeWidth="1.6" />
      </>
    ),
    centerpiece: (
      <>
        <rect x="80" y="90" width="40" height="26" rx="3" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <line x1="80" y1="98" x2="120" y2="98" stroke={THIN} strokeWidth="1" />
        <line x1="80" y1="105" x2="120" y2="105" stroke={THIN} strokeWidth="1" />
        <circle cx="100" cy="84" r="4" fill="none" stroke={ACC} strokeWidth="1.3" />
        <rect x="88" y="128" width="24" height="7" fill="none" stroke={THIN} strokeWidth="1" />
      </>
    ),
    mirrorsOrExhaust: (
      <>
        <path d="M46,80 Q38,77 36,83 Q35,87 42,88" fill="none" stroke={STROKE} strokeWidth="1.4" />
        <path d="M154,80 Q162,77 164,83 Q165,87 158,88" fill="none" stroke={STROKE} strokeWidth="1.4" />
      </>
    ),
  },
  roadster: {
    body: 'M70,64 Q100,56 130,64 L142,76 Q150,84 150,94 L170,104 Q178,112 178,122 L176,138 Q175,142 170,142 L30,142 Q25,142 24,138 L22,122 Q22,112 30,104 L50,94 Q50,84 58,76 Z',
    glass: (
      <>
        <path d="M76,65 Q100,58 124,65 L134,75 L66,75 Z" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <path d="M60,75 Q100,68 140,75" fill="none" stroke={THIN} strokeWidth="1.2" strokeDasharray="3 3" />
      </>
    ),
    lamps: (
      <>
        <circle cx="38" cy="106" r="9" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <circle cx="162" cy="106" r="9" fill="none" stroke={STROKE} strokeWidth="1.6" />
      </>
    ),
    centerpiece: (
      <>
        <rect x="78" y="100" width="44" height="22" rx="3" fill="none" stroke={STROKE} strokeWidth="1.6" />
        <line x1="78" y1="106" x2="122" y2="106" stroke={THIN} strokeWidth="1" />
        <line x1="78" y1="112" x2="122" y2="112" stroke={THIN} strokeWidth="1" />
        <line x1="78" y1="118" x2="122" y2="118" stroke={THIN} strokeWidth="1" />
        <circle cx="100" cy="93" r="4" fill="none" stroke={ACC} strokeWidth="1.3" />
        <rect x="86" y="130" width="28" height="7" fill="none" stroke={THIN} strokeWidth="1" />
      </>
    ),
    mirrorsOrExhaust: (
      <>
        <path d="M58,74 Q50,71 48,77 Q47,81 54,82" fill="none" stroke={STROKE} strokeWidth="1.4" />
        <path d="M142,74 Q150,71 152,77 Q153,81 146,82" fill="none" stroke={STROKE} strokeWidth="1.4" />
      </>
    ),
  },
};

const REAR_SHAPES: Record<Body, EndShape> = {
  sedan: {
    body: 'M56,50 Q100,40 144,50 L152,66 Q158,72 158,84 L176,98 Q182,106 182,118 L180,138 Q179,142 174,142 L26,142 Q21,142 20,138 L18,118 Q18,106 24,98 L42,84 Q42,72 48,66 Z',
    glass: (
      <>
        <path d="M64,51 Q100,42 136,51 L142,64 L58,64 Z" fill="none" stroke={STROKE} strokeWidth="1.6" />
      </>
    ),
    lamps: (
      <>
        <rect x="24" y="88" width="18" height="24" rx="2" fill="none" stroke={ACC} strokeWidth="1.6" />
        <rect x="158" y="88" width="18" height="24" rx="2" fill="none" stroke={ACC} strokeWidth="1.6" />
      </>
    ),
    centerpiece: (
      <>
        <path d="M46,86 Q100,80 154,86" fill="none" stroke={THIN} strokeWidth="1.2" />
        <rect x="82" y="112" width="36" height="16" fill="none" stroke={STROKE} strokeWidth="1.4" />
        <circle cx="100" cy="98" r="4" fill="none" stroke={STROKE} strokeWidth="1.3" />
      </>
    ),
    mirrorsOrExhaust: (
      <>
        <line x1="88" y1="140" x2="82" y2="146" stroke={STROKE} strokeWidth="1.4" />
        <line x1="112" y1="140" x2="118" y2="146" stroke={STROKE} strokeWidth="1.4" />
      </>
    ),
  },
  coupe: {
    body: 'M60,54 Q100,45 140,54 L150,68 Q156,74 156,84 L174,98 Q181,106 181,118 L179,138 Q178,142 173,142 L27,142 Q22,142 21,138 L19,118 Q19,106 26,98 L44,84 Q44,74 50,68 Z',
    glass: (
      <>
        <path d="M68,55 Q100,47 132,55 L138,66 L62,66 Z" fill="none" stroke={STROKE} strokeWidth="1.6" />
      </>
    ),
    lamps: (
      <>
        <path d="M32,90 Q46,88 46,100 Q46,110 32,110 Q26,110 26,100 Q26,90 32,90 Z" fill="none" stroke={ACC} strokeWidth="1.6" />
        <path d="M168,90 Q154,88 154,100 Q154,110 168,110 Q174,110 174,100 Q174,90 168,90 Z" fill="none" stroke={ACC} strokeWidth="1.6" />
      </>
    ),
    centerpiece: (
      <>
        <path d="M50,84 Q100,78 150,84" fill="none" stroke={THIN} strokeWidth="1.2" />
        <rect x="84" y="110" width="32" height="14" fill="none" stroke={STROKE} strokeWidth="1.4" />
        <circle cx="100" cy="96" r="4" fill="none" stroke={STROKE} strokeWidth="1.3" />
      </>
    ),
    mirrorsOrExhaust: (
      <>
        <circle cx="82" cy="140" r="4" fill="none" stroke={THIN} strokeWidth="1.3" />
        <circle cx="118" cy="140" r="4" fill="none" stroke={THIN} strokeWidth="1.3" />
      </>
    ),
  },
  roadster: {
    body: 'M68,68 Q100,60 132,68 L144,80 Q150,86 150,94 L170,104 Q178,112 178,122 L176,138 Q175,142 170,142 L30,142 Q25,142 24,138 L22,122 Q22,112 30,104 L50,94 Q50,86 56,80 Z',
    glass: (
      <>
        <path d="M76,69 Q100,62 124,69 L132,78 L68,78 Z" fill="none" stroke={STROKE} strokeWidth="1.6" />
      </>
    ),
    lamps: (
      <>
        <circle cx="38" cy="104" r="10" fill="none" stroke={ACC} strokeWidth="1.6" />
        <circle cx="162" cy="104" r="10" fill="none" stroke={ACC} strokeWidth="1.6" />
      </>
    ),
    centerpiece: (
      <>
        <path d="M54,98 Q100,92 146,98" fill="none" stroke={THIN} strokeWidth="1.2" />
        <rect x="84" y="118" width="32" height="14" fill="none" stroke={STROKE} strokeWidth="1.4" />
        <text x="100" y="128" fontSize="6" fill={THIN} textAnchor="middle" fontFamily="var(--font-mono)">
          280 SL
        </text>
      </>
    ),
    mirrorsOrExhaust: (
      <>
        <circle cx="86" cy="140" r="4" fill="none" stroke={THIN} strokeWidth="1.3" />
        <circle cx="96" cy="140" r="4" fill="none" stroke={THIN} strokeWidth="1.3" />
        <circle cx="104" cy="140" r="4" fill="none" stroke={THIN} strokeWidth="1.3" />
        <circle cx="114" cy="140" r="4" fill="none" stroke={THIN} strokeWidth="1.3" />
      </>
    ),
  },
};

function EndFigure({ body, shapes, label }: { body: Body; shapes: Record<Body, EndShape>; label: string }) {
  const s = shapes[body] ?? shapes.sedan;
  return (
    <svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={label}>
      <line x1="15" y1="30" x2="15" y2="148" stroke={THIN} strokeWidth=".7" strokeDasharray="2 4" />
      <line x1="185" y1="30" x2="185" y2="148" stroke={THIN} strokeWidth=".7" strokeDasharray="2 4" />
      <line x1="8" y1="152" x2="192" y2="152" stroke={THIN} strokeWidth="1" strokeDasharray="4 5" />
      <path d={s.body} fill="none" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      {s.glass}
      {s.lamps}
      {s.centerpiece}
      {s.mirrorsOrExhaust}
      <path d="M18,120 Q18,134 30,138" fill="none" stroke={THIN} strokeWidth="1.6" />
      <path d="M182,120 Q182,134 170,138" fill="none" stroke={THIN} strokeWidth="1.6" />
    </svg>
  );
}

export default function Blueprint({ body, view = 'side' }: { body: Body; view?: CarView }) {
  if (view === 'front') return <EndFigure body={body} shapes={FRONT_SHAPES} label="Vedere din față" />;
  if (view === 'rear') return <EndFigure body={body} shapes={REAR_SHAPES} label="Vedere din spate" />;
  return <SideFigure body={body} />;
}
