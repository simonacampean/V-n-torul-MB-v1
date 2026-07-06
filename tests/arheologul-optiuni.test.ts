// Arheologul de Opțiuni e 100% determinist (fără apel Claude) — toate
// testele rulează izolat, fără ANTHROPIC_API_KEY.
import { describe, it, expect } from 'vitest';
import {
  detecteazaDotari,
  calculeazaBonusRaritate,
  construiesteNotaRaritate,
  arheologulOptiuniOutputSchema,
  arheologulOptiuniAgent,
} from '../lib/agents/arheologul-optiuni';

describe('detecteazaDotari', () => {
  it('detectează dotări premium în text german', () => {
    const dotari = detecteazaDotari('Ausstattung: Sportline, Schiebedach, Klimaautomatik, Velours.');
    const etichete = dotari.map((d) => d.eticheta);
    expect(etichete).toContain('Pachet Sportline');
    expect(etichete).toContain('Trapă electrică (Schiebedach)');
    expect(etichete).toContain('Climatizare automată (Klimaautomatik)');
    expect(etichete).toContain('Tapițerie Velour');
  });

  it('NU detectează „Becker" ca nume propriu, doar ca radio explicit', () => {
    const dotari = detecteazaDotari('Vândut de Autohaus Becker, mașină foarte curată.');
    expect(dotari.map((d) => d.eticheta)).not.toContain('Radio Becker');
  });

  it('detectează radioul Becker când e menționat explicit', () => {
    const dotari = detecteazaDotari('Dotat cu radio Becker original de fabrică.');
    expect(dotari.map((d) => d.eticheta)).toContain('Radio Becker');
  });

  it('detectează o dotare extrem de rară (piele bicoloră)', () => {
    const dotari = detecteazaDotari('Interior cu piele bicoloră, foarte rar.');
    expect(dotari).toContainEqual({ eticheta: 'Piele bicoloră', nivel: 'rar_extrem' });
  });

  it('nu detectează nimic pe text neutru', () => {
    expect(detecteazaDotari('Mașină în stare bună, km reali.')).toEqual([]);
  });

  it('e case-insensitive', () => {
    const dotari = detecteazaDotari('SPORTLINE și KLIMAAUTOMATIK montate din fabrică.');
    expect(dotari.length).toBe(2);
  });
});

describe('calculeazaBonusRaritate', () => {
  it('întoarce 0 fără nicio dotare', () => {
    expect(calculeazaBonusRaritate([])).toBe(0);
  });

  it('întoarce 0 cu 3 dotări premium (nu peste prag, ci egal)', () => {
    const dotari = [
      { eticheta: 'a', nivel: 'premium' as const },
      { eticheta: 'b', nivel: 'premium' as const },
      { eticheta: 'c', nivel: 'premium' as const },
    ];
    expect(calculeazaBonusRaritate(dotari)).toBe(0);
  });

  it('întoarce 5 cu peste 3 dotări premium', () => {
    const dotari = Array.from({ length: 4 }, (_, i) => ({ eticheta: `d${i}`, nivel: 'premium' as const }));
    expect(calculeazaBonusRaritate(dotari)).toBe(5);
  });

  it('întoarce 10 cu o singură dotare extrem de rară, indiferent de restul', () => {
    const dotari = [{ eticheta: 'Piele bicoloră', nivel: 'rar_extrem' as const }];
    expect(calculeazaBonusRaritate(dotari)).toBe(10);
  });

  it('nu cumulează — extrem de rar + multe premium tot dă 10, nu 15', () => {
    const dotari = [
      ...Array.from({ length: 5 }, (_, i) => ({ eticheta: `d${i}`, nivel: 'premium' as const })),
      { eticheta: 'Pachet AMG autentic de epocă', nivel: 'rar_extrem' as const },
    ];
    expect(calculeazaBonusRaritate(dotari)).toBe(10);
  });
});

describe('construiesteNotaRaritate', () => {
  it('mesaj specific pentru nicio dotare', () => {
    expect(construiesteNotaRaritate([], 0)).toMatch(/nicio dotare/i);
  });

  it('mesaj cu bonus pentru dotare extrem de rară', () => {
    const nota = construiesteNotaRaritate([{ eticheta: 'Piele bicoloră', nivel: 'rar_extrem' }], 10);
    expect(nota).toMatch(/extrem de rară/i);
    expect(nota).toContain('Piele bicoloră');
  });
});

describe('arheologulOptiuniOutputSchema', () => {
  it('validează un output corect', () => {
    const parsed = arheologulOptiuniOutputSchema.parse({
      dotari_rare_detectate: ['Pachet Sportline'],
      nota_raritate: 'test',
      bonus_dotari_rare: 5,
    });
    expect(parsed.bonus_dotari_rare).toBe(5);
  });

  it('respinge un bonus în afara intervalului 0-10', () => {
    expect(() =>
      arheologulOptiuniOutputSchema.parse({ dotari_rare_detectate: [], nota_raritate: 'x', bonus_dotari_rare: 20 })
    ).toThrow();
  });
});

describe('arheologulOptiuniAgent.run (fără ANTHROPIC_API_KEY — e determinist)', () => {
  it('procesează text real de la un anunț și calculează bonusul corect', async () => {
    const result = await arheologulOptiuniAgent.run({
      text: 'Mașină cu pachet Sportline, trapă electrică (Schiebedach), Klimaautomatik și jante din aliaj originale.',
    });
    expect(result.dotari_rare_detectate.length).toBe(4);
    expect(result.bonus_dotari_rare).toBe(5);
  });

  it('text null ⇒ niciun rezultat, bonus 0', async () => {
    const result = await arheologulOptiuniAgent.run({ text: null });
    expect(result.dotari_rare_detectate).toEqual([]);
    expect(result.bonus_dotari_rare).toBe(0);
  });
});
