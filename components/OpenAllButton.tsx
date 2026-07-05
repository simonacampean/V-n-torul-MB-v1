'use client';

/** Reduce fricțiunea de a deschide platformele una câte una — deschide tot
 * grupul într-un singur click. Unele browsere pot bloca tab-urile în plus ca
 * pop-up-uri (limitare a browserului, nu a aplicației); userul poate permite
 * manual dacă se întâmplă. */
export default function OpenAllButton({ urls, label }: { urls: string[]; label: string }) {
  function handleClick() {
    urls.forEach((u) => window.open(u, '_blank', 'noopener,noreferrer'));
  }
  return (
    <button type="button" className="btn dark" onClick={handleClick} disabled={!urls.length}>
      {label}
    </button>
  );
}
