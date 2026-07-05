import Image from 'next/image';
import { MODEL_ANGLE_PHOTOS, MODEL_TECH_IMAGE, type CarAngle } from '@/lib/model-photos';

const ANGLE_LABELS: Record<CarAngle, string> = { front: 'Față', side: 'Lateral', rear: 'Spate' };
const ANGLES: CarAngle[] = ['front', 'side', 'rear'];

/** Fișă tehnică unică (față+motor+spate+lateral într-o singură ilustrație,
 * generată de beneficiar) acolo unde există — altfel cade pe rândul de 3
 * fotografii reale (Wikimedia Commons, cu atribuire per imagine). */
export default function CarPhotoRow({ modelCode }: { modelCode: string }) {
  const tech = MODEL_TECH_IMAGE[modelCode];
  if (tech) {
    return (
      <div className="blueprint-single">
        <Image
          src={tech.file}
          alt={`${modelCode} — fișă tehnică`}
          width={tech.width}
          height={tech.height}
          sizes="(max-width: 700px) 100vw, 700px"
        />
      </div>
    );
  }

  const angles = MODEL_ANGLE_PHOTOS[modelCode];
  if (!angles) return null;

  return (
    <div className="blueprint-row">
      {ANGLES.map((angle) => {
        const p = angles[angle];
        return (
          <div className="blueprint-col" key={angle}>
            <div className="blueprint-photo">
              <Image
                src={p.file}
                alt={`${modelCode} — vedere ${ANGLE_LABELS[angle].toLowerCase()}`}
                width={p.width}
                height={p.height}
                sizes="(max-width: 560px) 90vw, 220px"
              />
            </div>
            <span className="blueprint-col-label">{ANGLE_LABELS[angle]}</span>
            <span className="blueprint-col-credit">
              Foto:{' '}
              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                {p.author}
              </a>
              {p.licenseUrl ? (
                <>
                  {' '}
                  (
                  <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">
                    {p.license}
                  </a>
                  )
                </>
              ) : (
                ` (${p.license})`
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
