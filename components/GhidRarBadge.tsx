const NIVEL: Record<string, 'done' | 'warn' | 'todo'> = {
  Eligibil: 'done',
  Incert: 'warn',
  Neeligibil: 'todo',
};

/** Rezultatul verificării automate (Ghidul RAR) — afișat adminului înainte de
 * decizia de moderare; nu ascunde nimic, doar semnalează. */
export default function GhidRarBadge({
  eligibilitate,
  rezumat,
}: {
  eligibilitate: string | null | undefined;
  rezumat: string | null | undefined;
}) {
  if (!eligibilitate) return null;
  const nivel = NIVEL[eligibilitate] ?? 'warn';

  return (
    <div style={{ marginTop: 8 }}>
      <span className={`status ${nivel}`}>Ghidul RAR: {eligibilitate}</span>
      {rezumat && (
        <div className="note" style={{ marginTop: 6 }}>
          <b>Rezumat RO:</b> {rezumat}
        </div>
      )}
    </div>
  );
}
