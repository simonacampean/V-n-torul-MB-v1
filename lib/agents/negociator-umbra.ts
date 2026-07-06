// ============================================================
// Negociatorul din Umbră — agent AI care detectează schimbări subtile în
// descrierea unui anunț salvat (Lista mea) coroborate cu scăderi de preț,
// și recomandă o strategie de negociere.
//
// Separare deliberată (același principiu ca la Trend-Scout): diff-ul de
// text, detectarea semnalelor de urgență și calculul indicelui (0-100,
// inclusiv creșterea exponențială la scăderi succesive de preț în <30 zile)
// sunt COMPLET deterministe (TypeScript pur) — un indice financiar nu se
// lasă pe seama aritmeticii unui LLM. Singurul apel Claude e pentru partea
// care chiar necesită înțelegere de limbaj: strategia de negociere.
// ============================================================
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from './types';

const MODEL = 'claude-sonnet-4-5';

export interface PricePoint {
  price: number;
  at: string;
}

export interface TextDiffResult {
  adaugat: string[];
  eliminat: string[];
}

// ---- text_diff — determinist, la nivel de propoziție ----
function normalizeazaPropozitii(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

export function textDiff(descriereAnterioara: string | null, descriereCurenta: string): TextDiffResult {
  const curente = normalizeazaPropozitii(descriereCurenta);
  if (!descriereAnterioara) return { adaugat: [], eliminat: [] };

  const anterioare = normalizeazaPropozitii(descriereAnterioara);
  const setAnterior = new Set(anterioare.map((s) => s.toLowerCase()));
  const setCurent = new Set(curente.map((s) => s.toLowerCase()));

  return {
    adaugat: curente.filter((s) => !setAnterior.has(s.toLowerCase())),
    eliminat: anterioare.filter((s) => !setCurent.has(s.toLowerCase())),
  };
}

// ---- keyword_counter (semnale de urgență) — determinist ----
interface SemnalUrgenta {
  fraze: string[];
  puncte: number;
  eticheta: string;
}

// Semnale care cresc urgența dacă APAR nou în descriere.
const SEMNALE_ADAUGATE: SemnalUrgenta[] = [
  { fraze: ['plec din tara', 'plec din țară', 'ne mutam', 'ne mutăm', 'leaving the country', 'moving abroad'], puncte: 25, eticheta: 'Vânzătorul menționează plecarea din țară / mutarea — presiune de timp reală' },
  { fraze: ['trebuie sa vand', 'trebuie să vând', 'must sell', 'need to sell fast'], puncte: 20, eticheta: 'Vânzătorul spune explicit că trebuie să vândă' },
  { fraze: ['urgent'], puncte: 20, eticheta: 'Cuvântul „urgent" a apărut nou în descriere' },
  { fraze: ['ultima oferta', 'ultima ofertă', 'last chance', 'pret final', 'preț final'], puncte: 15, eticheta: 'Limbaj de „ultimă șansă" / preț final' },
  { fraze: ['pret fix', 'preț fix', 'fixed price'], puncte: 10, eticheta: 'A apărut „preț fix" — posibil a atins limita reală, merită testat direct' },
];

// Semnale care cresc urgența dacă DISPAR din descriere (vânzătorul a renunțat la o pretenție inițială).
const SEMNALE_ELIMINATE: SemnalUrgenta[] = [
  { fraze: ['pret ferm', 'preț ferm', 'nu negociez', 'fara negociere', 'fără negociere', 'non-negotiable', 'firm price'], puncte: 20, eticheta: 'A renunțat la poziția inițială de preț ferm/nenegociabil' },
];

function contineFraza(text: string, fraze: string[]): boolean {
  return fraze.some((f) => text.includes(f));
}

export function detecteazaSemnaleUrgenta(diff: TextDiffResult): { semnale: string[]; puncte: number } {
  const semnale: string[] = [];
  let puncte = 0;

  const adaugatText = diff.adaugat.join(' ').toLowerCase();
  for (const semnal of SEMNALE_ADAUGATE) {
    if (contineFraza(adaugatText, semnal.fraze)) {
      semnale.push(semnal.eticheta);
      puncte += semnal.puncte;
    }
  }

  const eliminatText = diff.eliminat.join(' ').toLowerCase();
  for (const semnal of SEMNALE_ELIMINATE) {
    if (contineFraza(eliminatText, semnal.fraze)) {
      semnale.push(semnal.eticheta);
      puncte += semnal.puncte;
    }
  }

  return { semnale, puncte };
}

// ---- calculul indicelui de urgență — determinist ----
function diffInDays(aIso: string, bIso: string): number {
  return Math.abs(new Date(bIso).getTime() - new Date(aIso).getTime()) / (1000 * 60 * 60 * 24);
}

/** Scăderi succesive de preț în mai puțin de 30 de zile fac indicele să
 * crească exponențial (15, 30, 60, 120... înainte de plafonare la 100) —
 * o singură scădere izolată contează normal, dar un vânzător care tot
 * reduce prețul rapid semnalează presiune reală de a vinde. */
export function calculeazaIndiceUrgenta(priceHistory: PricePoint[], puncteSemnale: number): number {
  let indiceBaza = 0;
  let consecutive = 0;

  for (let i = 1; i < priceHistory.length; i++) {
    const anterior = priceHistory[i - 1];
    const curent = priceHistory[i];
    const scazut = curent.price < anterior.price;
    const zile = diffInDays(anterior.at, curent.at);

    if (scazut && zile < 30) {
      consecutive += 1;
      indiceBaza += 15 * 2 ** (consecutive - 1);
    } else if (scazut) {
      consecutive = 1;
      indiceBaza += 15;
    } else {
      consecutive = 0;
    }
  }

  return Math.max(0, Math.min(100, Math.round(indiceBaza + puncteSemnale)));
}

export function construiesteSchimbariCheie(diff: TextDiffResult, semnale: string[], priceHistory: PricePoint[]): string[] {
  const schimbari: string[] = [...semnale];

  if (priceHistory.length > 1) {
    const [anterior, curent] = priceHistory.slice(-2);
    if (curent.price < anterior.price) {
      const scaderePct = Math.round(((anterior.price - curent.price) / anterior.price) * 100);
      const zile = Math.round(diffInDays(anterior.at, curent.at));
      schimbari.push(`Preț scăzut cu ${scaderePct}% (${anterior.price}€ → ${curent.price}€) în ${zile} zile`);
    }
  }
  diff.adaugat.slice(0, 5).forEach((s) => schimbari.push(`Text nou în anunț: „${s}"`));
  diff.eliminat.slice(0, 5).forEach((s) => schimbari.push(`Text eliminat din anunț: „${s}"`));

  return schimbari;
}

// ---- Schema de output ----
export const negociatorOutputSchema = z.object({
  indice_urgenta: z.number().int().min(0).max(100),
  schimbari_cheie_detectate: z.array(z.string()),
  strategie_negociere_recomandata: z.string(),
});
export type NegociatorOutput = z.infer<typeof negociatorOutputSchema>;

const SUBMIT_REPORT_TOOL: Anthropic.Tool = {
  name: 'submit_report',
  description: 'Trimite strategia de negociere finală. Apelează O SINGURĂ DATĂ, la final.',
  input_schema: {
    type: 'object',
    properties: {
      strategie_negociere_recomandata: { type: 'string' },
    },
    required: ['strategie_negociere_recomandata'],
  },
};

function buildSystemPrompt(indice: number, schimbari: string[]): string {
  const listaSchimbari = schimbari.length
    ? schimbari.map((s) => `- ${s}`).join('\n')
    : '(nicio schimbare textuală detectată — doar mișcarea de preț contează aici)';

  return `## ROL
Ești „Negociatorul din Umbră" — un consultant expert în negocierea achiziției de mașini clasice europene, care ajută cumpărătorul să obțină cel mai bun preț posibil, folosind exact cuvintele și schimbările pe care vânzătorul le-a făcut singur în anunț.

## DATE DEJA CALCULATE (determinist, nu le recalcula, nu le contrazice)
Indicele de urgență al vânzătorului a fost deja calculat: ${indice}/100.
Schimbările cheie deja detectate între versiunea anterioară și cea curentă a anunțului:
${listaSchimbari}

## CE TREBUIE SĂ FACI TU (partea care chiar necesită înțelegere de limbaj)
Scrie strategia de negociere recomandată — 3-5 propoziții, concrete, în română, cu argumente EXACTE pe care cumpărătorul le poate folosi la telefon cu vânzătorul, bazate STRICT pe schimbările de mai sus. Nu inventa detalii despre mașină care nu apar în listă. Dacă indicele e mic și nu există schimbări relevante, recomandă răbdare, nu presiune inventată.

## FORMAT DE RĂSPUNS — OBLIGATORIU
Apelează \`submit_report\` cu rezultatul final. Nu răspunde cu text liber în locul acestui apel.`;
}

async function genereazaStrategie(client: Anthropic, indice: number, schimbari: string[]): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(indice, schimbari),
    tools: [SUBMIT_REPORT_TOOL],
    messages: [{ role: 'user', content: 'Generează strategia de negociere.' }],
  });

  const submitCall = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_report'
  );
  if (!submitCall) throw new Error('Agentul nu a apelat submit_report.');

  const parsed = z.object({ strategie_negociere_recomandata: z.string() }).parse(submitCall.input);
  return parsed.strategie_negociere_recomandata;
}

export interface NegociatorInput {
  descriereAnterioara: string | null;
  descriereCurenta: string;
  priceHistory: PricePoint[];
}

/** Definiția agentului conform interfeței comune — vezi lib/agents/types.ts.
 *
 * NOTĂ LEGALĂ: la fel ca Detectivul de Autenticitate și Trend-Scout, acest
 * agent NU vizitează el însuși anunțul — primește `descriereCurenta` deja
 * capturată de rutina de recheck (permisă legal: pagină individuală, nu
 * scraping de listare). Sursa reală de date se conectează separat. */
export const negociatorUmbraAgent: AgentDefinition<NegociatorInput, NegociatorOutput> = {
  id: 'negociator-umbra',
  name: 'Negociatorul din Umbră',
  description:
    'Detectează schimbări subtile în descrierea unui anunț salvat (semnale de urgență ale vânzătorului) coroborate cu scăderile de preț, și recomandă o strategie de negociere.',
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async run(input: NegociatorInput) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY lipsește din variabilele de mediu.');

    const diff = textDiff(input.descriereAnterioara, input.descriereCurenta);
    const { semnale, puncte } = detecteazaSemnaleUrgenta(diff);
    const indice = calculeazaIndiceUrgenta(input.priceHistory, puncte);
    const schimbari = construiesteSchimbariCheie(diff, semnale, input.priceHistory);

    const client = new Anthropic({ apiKey });
    const strategie = await genereazaStrategie(client, indice, schimbari);

    return negociatorOutputSchema.parse({
      indice_urgenta: indice,
      schimbari_cheie_detectate: schimbari,
      strategie_negociere_recomandata: strategie,
    });
  },
};
