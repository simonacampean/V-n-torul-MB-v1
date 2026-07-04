import Image from 'next/image';
import { MODEL_PHOTOS } from '@/lib/model-photos';

/** Fotografie reală per model (Wikimedia Commons, licențe libere) — atribuire obligatorie sub imagine. */
export default function ModelPhoto({ code, alt }: { code: string; alt: string }) {
  const photo = MODEL_PHOTOS[code];
  if (!photo) return null;

  return (
    <div className="model-photo">
      <Image
        src={photo.file}
        alt={alt}
        width={photo.width}
        height={photo.height}
        sizes="(max-width: 640px) 100vw, 760px"
        priority={false}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
      <div className="model-photo-credit mono">
        Foto:{' '}
        <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">
          {photo.author}, Wikimedia Commons
        </a>
        {photo.licenseUrl ? (
          <>
            {' '}
            (
            <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">
              {photo.license}
            </a>
            )
          </>
        ) : (
          ` (${photo.license})`
        )}
      </div>
    </div>
  );
}
