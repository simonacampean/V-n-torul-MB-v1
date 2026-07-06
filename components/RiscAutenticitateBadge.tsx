import type { RaportAutenticitate } from '@/lib/agents/detectiv-autenticitate';

/** Rezultatul verificării automate (Detectivul de Autenticitate), afișat
 * adminului înainte de decizia de moderare — nu ascunde nimic, doar
 * semnalează; decizia finală rămâne mereu a omului (AD-02). */
export default function RiscAutenticitateBadge({
  scor,
  detalii,
}: {
  scor: number | null | undefined;
  detalii: RaportAutenticitate | null | undefined;
}) {
  if (scor == null) return null;
  const nivel = scor <= 3 ? 'done' : scor <= 6 ? 'warn' : 'todo';
  const eticheta = scor <= 3 ? 'risc scăzut' : scor <= 6 ? 'risc mediu' : 'risc ridicat';

  return (
    <div style={{ marginTop: 8 }}>
      <span className={`status ${nivel}`}>Detectivul de Autenticitate: {scor}/10 · {eticheta}</span>
      {detalii?.puncte_critice_detectate?.length ? (
        <ul className="ghid" style={{ marginTop: 6 }}>
          {detalii.puncte_critice_detectate.map((p, i) => (
            <li key={i}>
              <b>{p.severitate}</b> ({p.categorie.replace(/_/g, ' ')}) — {p.descriere}
            </li>
          ))}
        </ul>
      ) : null}
      {detalii?.intrebari_de_pus_vanzatorului?.length ? (
        <div className="note" style={{ marginTop: 6 }}>
          <b>Întrebări de pus vânzătorului:</b>
          <ul style={{ marginTop: 4, paddingLeft: 18 }}>
            {detalii.intrebari_de_pus_vanzatorului.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
