import type { FiltruAntiFalsOutput } from '@/lib/agents/filtru-anti-fals';

const NIVEL: Record<string, 'done' | 'warn' | 'todo'> = {
  Original: 'done',
  Modificat: 'warn',
  Suspicios: 'warn',
  Replica: 'todo',
};

/** Rezultatul verificării automate (Filtru Anti-Fals / Replica Detector),
 * afișat adminului înainte de decizia de moderare — nu ascunde nimic, doar
 * semnalează; decizia finală rămâne mereu a omului (AD-02). */
export default function FiltruAntiFalsBadge({ detalii }: { detalii: FiltruAntiFalsOutput | null | undefined }) {
  if (!detalii?.autenticitate_pachet) return null;
  const nivel = NIVEL[detalii.autenticitate_pachet] ?? 'warn';

  return (
    <div style={{ marginTop: 8 }}>
      <span className={`status ${nivel}`}>Filtru Anti-Fals: {detalii.autenticitate_pachet}</span>
      {detalii.alerta_frauda_pret && (
        <span className="status todo" style={{ marginLeft: 6 }}>
          preț de original cerut pe o variantă neconformă
        </span>
      )}
      {detalii.nota_explicativa && (
        <div className="note" style={{ marginTop: 6 }}>
          {detalii.nota_explicativa}
        </div>
      )}
      {detalii.semnale_detectate?.length ? (
        <ul className="ghid" style={{ marginTop: 6 }}>
          {detalii.semnale_detectate.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
