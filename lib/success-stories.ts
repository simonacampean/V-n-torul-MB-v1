/** Economia calculată determinist din cifrele reale trimise de utilizator —
 * folosită atât pe homepage (SuccessStories) cât și în admin (/admin/povesti),
 * ca să nu existe două implementări posibil-divergente ale aceleiași formule. */
export function calculeazaEconomie(pretAchizitie: number, pretMediuPiataAtunci: number | null): number | null {
  if (pretMediuPiataAtunci == null || pretMediuPiataAtunci <= pretAchizitie) return null;
  return pretMediuPiataAtunci - pretAchizitie;
}
