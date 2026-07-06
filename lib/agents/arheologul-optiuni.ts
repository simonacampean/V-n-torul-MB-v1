// ============================================================
// Arheologul de Opțiuni — agent care extrage dotările de fabrică rare/
// valoroase menționate în descrierea (deseori tradusă) a unui anunț, prin
// comparație cu un dicționar de opțiuni Mercedes-Benz din anii '80-'90.
//
// Spre deosebire de toți ceilalți agenți din acest fișier, acesta e 100%
// determinist — NU face niciun apel Claude. Potrivirea cu un dicționar fix
// de termeni (Sportline, Wurzelnuss, Becker etc.) e strict căutare de
// cuvinte-cheie, nu interpretare de limbaj — un LLM n-ar adăuga nimic decât
// cost și risc de invenție. Bonusul de raritate e calculat și stocat, dar
// NU e conectat la offer_score()/offerScore() — formula de scoring e
// protejată explicit (v5 = sursă de adevăr, necesită acordul beneficiarului
// + actualizarea testelor de paritate SQL/TS) — vezi lib/scoring.ts.
// ============================================================
import { z } from 'zod';
import type { AgentDefinition } from './types';

interface DotareCunoscuta {
  eticheta: string;
  fraze: string[];
  nivel: 'premium' | 'rar_extrem';
}

// Fraze cu mai multe cuvinte acolo unde termenul simplu ar da fals-pozitive
// (ex. „Becker” e și un nume de familie/dealer German comun).
const DOTARI_CUNOSCUTE: DotareCunoscuta[] = [
  { eticheta: 'Pachet Sportline', fraze: ['sportline', 'sport-line'], nivel: 'premium' },
  { eticheta: 'Scaune ortopedice (Ortho)', fraze: ['ortho-sitze', 'orthopädische sitze', 'orthopadische sitze', 'scaune ortopedice'], nivel: 'premium' },
  { eticheta: 'Interior lemn de mahon/nuc (Wurzelnuss)', fraze: ['wurzelnuss', 'wurzelholz', 'lemn de mahon', 'lemn de nuc', 'walnut wood', 'burl walnut'], nivel: 'premium' },
  { eticheta: 'Radio Becker', fraze: ['becker grand prix', 'becker mexico', 'radio becker', 'becker europa', 'autoradio becker'], nivel: 'premium' },
  { eticheta: 'Tapițerie Velour', fraze: ['velour', 'velours'], nivel: 'premium' },
  { eticheta: 'Climatizare automată (Klimaautomatik)', fraze: ['klimaautomatik', 'climatizare automată', 'climatizare automata', 'automatic climate control'], nivel: 'premium' },
  { eticheta: 'Trapă electrică (Schiebedach)', fraze: ['schiebedach', 'trapă electrică', 'trapa electrica', 'electric sunroof'], nivel: 'premium' },
  { eticheta: 'Scaune încălzite (Sitzheizung)', fraze: ['sitzheizung', 'scaune încălzite', 'scaune incalzite', 'heated seats'], nivel: 'premium' },
  { eticheta: 'Tempomat (cruise control)', fraze: ['tempomat', 'cruise control', 'regulator de viteză', 'regulator de viteza'], nivel: 'premium' },
  { eticheta: 'Jante din aliaj (Alufelgen)', fraze: ['alufelgen', 'jante din aliaj', 'jante de aliaj', 'alloy wheels'], nivel: 'premium' },
  { eticheta: 'Piele bicoloră', fraze: ['piele bicoloră', 'piele bicolora', 'zweifarbiges leder', 'two-tone leather', 'interior bicolor din piele'], nivel: 'rar_extrem' },
  { eticheta: 'Pachet AMG autentic de epocă', fraze: ['amg werksausstattung', 'amg de fabrică', 'amg de fabrica', 'pachet amg original de epocă', 'pachet amg original de epoca', 'factory amg package'], nivel: 'rar_extrem' },
];

const PRAG_PREMIUM_PENTRU_BONUS = 3; // „mai mult de 3 dotări premium"
const BONUS_RAR_EXTREM = 10;
const BONUS_PREMIUM = 5;

export interface DotareDetectata {
  eticheta: string;
  nivel: 'premium' | 'rar_extrem';
}

export function detecteazaDotari(text: string): DotareDetectata[] {
  const lower = text.toLowerCase();
  return DOTARI_CUNOSCUTE.filter((d) => d.fraze.some((f) => lower.includes(f))).map((d) => ({
    eticheta: d.eticheta,
    nivel: d.nivel,
  }));
}

/** O dotare extrem de rară dă bonusul maxim; altfel, peste pragul de dotări
 * premium dă bonusul mic; sub prag, niciun bonus. Nu se cumulează. */
export function calculeazaBonusRaritate(dotari: DotareDetectata[]): number {
  if (dotari.some((d) => d.nivel === 'rar_extrem')) return BONUS_RAR_EXTREM;
  const countPremium = dotari.filter((d) => d.nivel === 'premium').length;
  if (countPremium > PRAG_PREMIUM_PENTRU_BONUS) return BONUS_PREMIUM;
  return 0;
}

export function construiesteNotaRaritate(dotari: DotareDetectata[], bonus: number): string {
  if (!dotari.length) return 'Nicio dotare de valoare specială detectată în descriere.';
  const nume = dotari.map((d) => d.eticheta).join(', ');
  if (bonus === BONUS_RAR_EXTREM) {
    return `Configurație cu dotare extrem de rară (${nume}) — valoare de revânzare semnificativ ridicată.`;
  }
  if (bonus === BONUS_PREMIUM) {
    return `Configurație cu ${dotari.length} dotări premium (${nume}) — valoare de revânzare ridicată datorită opțiunilor de confort.`;
  }
  return `Dotări identificate: ${nume} — sub pragul pentru un bonus de raritate.`;
}

export const arheologulOptiuniOutputSchema = z.object({
  dotari_rare_detectate: z.array(z.string()),
  nota_raritate: z.string(),
  bonus_dotari_rare: z.number().int().min(0).max(10),
});
export type ArheologulOptiuniOutput = z.infer<typeof arheologulOptiuniOutputSchema>;

export interface ArheologulOptiuniInput {
  text: string | null;
}

/** Definiția agentului conform interfeței comune — vezi lib/agents/types.ts.
 * `isConfigured` e omis intenționat: acest agent nu are nevoie niciodată de
 * ANTHROPIC_API_KEY, e mereu „configurat". */
export const arheologulOptiuniAgent: AgentDefinition<ArheologulOptiuniInput, ArheologulOptiuniOutput> = {
  id: 'arheologul-optiuni',
  name: 'Arheologul de Opțiuni',
  description:
    'Extrage dotările de fabrică rare/valoroase menționate în descriere (dicționar Mercedes-Benz anii \'80-\'90) și calculează un bonus de raritate — 100% determinist, fără niciun apel Claude.',
  async run(input: ArheologulOptiuniInput) {
    const dotari = detecteazaDotari(input.text ?? '');
    const bonus = calculeazaBonusRaritate(dotari);
    return arheologulOptiuniOutputSchema.parse({
      dotari_rare_detectate: dotari.map((d) => d.eticheta),
      nota_raritate: construiesteNotaRaritate(dotari, bonus),
      bonus_dotari_rare: bonus,
    });
  },
};
