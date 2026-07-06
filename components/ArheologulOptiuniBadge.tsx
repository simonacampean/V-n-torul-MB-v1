/** Rezultatul Arheologului de Opțiuni — afișat adminului înainte de decizia
 * de moderare. Bonusul e informativ aici, NU e reflectat în scorul real al
 * ofertei (formula de scoring e protejată, vezi migrarea 0017). */
export default function ArheologulOptiuniBadge({
  dotari,
  nota,
  bonus,
}: {
  dotari: string[] | null | undefined;
  nota: string | null | undefined;
  bonus: number | null | undefined;
}) {
  if (!dotari?.length) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <span className={`status ${bonus ? 'done' : 'todo'}`}>
        Arheologul de Opțiuni: {dotari.length} dotări{bonus ? ` · bonus +${bonus} (neconectat la scor)` : ''}
      </span>
      <ul className="ghid" style={{ marginTop: 6 }}>
        {dotari.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
      {nota && (
        <div className="note" style={{ marginTop: 6 }}>
          {nota}
        </div>
      )}
    </div>
  );
}
