/** Rezultatul Calculatorului de Restaurare — afișat adminului înainte de
 * decizia de moderare, și pe pagina publică de oferte (F-05). */
export default function CalculatorRestaurareBadge({
  buget,
  detaliere,
  mesaj,
}: {
  buget: string | null | undefined;
  detaliere: string[] | null | undefined;
  mesaj: string | null | undefined;
}) {
  if (!buget) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <span className="status warn">Calculator de Restaurare: buget estimat {buget}</span>
      {detaliere?.length ? (
        <ul className="ghid" style={{ marginTop: 6 }}>
          {detaliere.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      ) : null}
      {mesaj && (
        <div className="note" style={{ marginTop: 6 }}>
          {mesaj}
        </div>
      )}
    </div>
  );
}
