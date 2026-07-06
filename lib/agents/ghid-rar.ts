// ============================================================
// Ghidul RAR (Auto de Epocă & Traducere) — agent AI care evaluează
// eligibilitatea unui anunț pentru statutul de „vehicul istoric" (RAR,
// aliniat standardelor FIVA) și produce un rezumat curat în română al
// descrierii externe.
//
// Separare deliberată: pragul legal de vârstă (30 de ani) e determinist —
// o dată de calendar, nu o interpretare de limbaj, deci NU e lăsat pe seama
// unui LLM. Când vehiculul e prea tânăr, agentul răspunde instant, fără
// niciun apel Claude. Verdictul de originalitate al Filtru Anti-Fals (dacă
// a rulat deja pe același anunț) e reutilizat ca fapt determinist, nu
// recalculat — prima folosire reală în producție a ideii de „agenți care
// își pasează date" din specificația inițială a proiectului.
// ============================================================
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from './types';
import type { FiltruAntiFalsOutput } from './filtru-anti-fals';

const MODEL = 'claude-sonnet-4-5';
const VARSTA_MINIMA_RAR = 30;

export function calculeazaVarstaVehicul(anFabricatie: number | null): number | null {
  if (anFabricatie == null) return null;
  return new Date().getFullYear() - anFabricatie;
}

// ---- Schema de output ----
export const ghidRarOutputSchema = z.object({
  eligibilitate_rar: z.enum(['Eligibil', 'Neeligibil', 'Incert']),
  rezumat_ro: z.string().nullable(),
  motiv_eligibilitate: z.string(),
});
export type GhidRarOutput = z.infer<typeof ghidRarOutputSchema>;

const SUBMIT_REPORT_TOOL: Anthropic.Tool = {
  name: 'submit_report',
  description: 'Trimite verdictul final de eligibilitate RAR și rezumatul în română. Apelează O SINGURĂ DATĂ, la final.',
  input_schema: {
    type: 'object',
    properties: {
      eligibilitate_rar: { type: 'string', enum: ['Eligibil', 'Neeligibil', 'Incert'] },
      rezumat_ro: { type: ['string', 'null'] },
      motiv_eligibilitate: { type: 'string' },
    },
    required: ['eligibilitate_rar', 'rezumat_ro', 'motiv_eligibilitate'],
  },
};

function buildSystemPrompt(
  input: GhidRarInput,
  varsta: number | null,
  verdictFiltru: FiltruAntiFalsOutput | null,
  varstaInsuficienta: boolean
): string {
  const faptaVarsta = varsta != null
    ? varstaInsuficienta
      ? `${varsta} ani — SUB pragul minim de ${VARSTA_MINIMA_RAR} ani. \`eligibilitate_rar\` e deja decis prin acest fapt: TREBUIE să fie exact „Neeligibil", nu-l recalcula.`
      : `${varsta} ani (îndeplinește pragul minim de ${VARSTA_MINIMA_RAR} ani).`
    : 'necunoscută — anul de fabricație nu a fost specificat în anunț.';
  const faptaFiltru = verdictFiltru
    ? `Filtru Anti-Fals a analizat deja acest anunț: „${verdictFiltru.autenticitate_pachet}" — ${verdictFiltru.nota_explicativa}`
    : 'Niciun verdict de autenticitate calculat separat pentru acest anunț.';

  return `## ROL
Ești „Ghidul RAR" — un expert în legislația română de înmatriculare a autovehiculelor istorice (RAR, aliniată standardelor FIVA), specializat și în traduceri tehnice auto. Ajuți cumpărătorii să înțeleagă dacă o mașină clasică poate obține statutul de „vehicul istoric" în România, și traduci descrieri externe într-un rezumat curat în română — util indiferent de eligibilitatea RAR, fiindcă platforma importă anunțuri din toată Europa în limbile lor native.

## CRITERII REALE DE ELIGIBILITATE (RAR/FIVA)
1. Vârstă minimă: ${VARSTA_MINIMA_RAR} de ani de la prima înmatriculare/fabricație.
2. Originalitate constructivă: vehiculul trebuie păstrat sau restaurat conform specificațiilor originale de fabrică — modificări majore ale motorului, șasiului sau caroseriei (ex. swap de motor, pachete de aspect care ascund o altă motorizare, conversii nedeclarate) compromit eligibilitatea sau o fac incertă.

## FAPTE DEJA VERIFICATE DETERMINIST (bază sigură, nu le contrazice)
Vârsta vehiculului: ${faptaVarsta}
${faptaFiltru}

## ANUNȚUL ANALIZAT
Titlu: ${input.titlu}
Text: ${input.text ?? '(fără text suplimentar)'}

## CE TREBUIE SĂ FACI TU
1. \`eligibilitate_rar\`: dacă vârsta nu e deja decisă mai sus, alege „Eligibil" DOAR dacă pragul de vârstă e îndeplinit ȘI nu există semnale de modificare majoră/lipsă de originalitate; „Neeligibil" dacă e clar că vehiculul nu mai e original (ex. Filtru Anti-Fals a găsit „Replica"); „Incert" când informația e insuficientă sau ambiguă (ex. an necunoscut, sau modificări minore/neclare).
2. \`rezumat_ro\`: un rezumat CURAT, în română, de 3-4 propoziții, stil profesional-obiectiv — NU o traducere cuvânt cu cuvânt (ar consuma prea multe token-uri și ar fi plictisitoare), ci sensul condensat. Tradu dacă textul original nu e deja în română. Acoperă explicit, DOAR când informația chiar există în text:
   - starea mecanică declarată (motor, cutie de viteze, funcționare generală)
   - defectele recunoscute chiar de vânzător (ex. rugină, zgârieturi, lovituri minore, piese lipsă) — nu le ascunde și nu le înmoaie
   - statutul actelor/istoricului (carte de service, ITP/inspecție tehnică, documentație de proveniență)
   Nu adăuga opinii sau exagerări de vânzare. Dacă nu există niciun text de rezumat, pune null.
3. \`motiv_eligibilitate\`: 1-2 propoziții care explică DE CE ai ales acel verdict de eligibilitate.

## FORMAT DE RĂSPUNS — OBLIGATORIU
Apelează \`submit_report\` cu rezultatul final. Nu răspunde cu text liber în locul acestui apel.`;
}

async function genereazaRaport(
  client: Anthropic,
  input: GhidRarInput,
  varsta: number | null,
  verdictFiltru: FiltruAntiFalsOutput | null,
  varstaInsuficienta: boolean
): Promise<GhidRarOutput> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(input, varsta, verdictFiltru, varstaInsuficienta),
    tools: [SUBMIT_REPORT_TOOL],
    messages: [{ role: 'user', content: 'Analizează anunțul și trimite verdictul.' }],
  });

  const submitCall = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_report'
  );
  if (!submitCall) throw new Error('Agentul nu a apelat submit_report.');

  return ghidRarOutputSchema.parse(submitCall.input);
}

export interface GhidRarInput {
  titlu: string;
  text: string | null;
  anFabricatie: number | null;
  /** Verdictul deja calculat de Filtru Anti-Fals pentru ACELAȘI anunț, dacă a rulat — pasat
   * direct, nu recalculat, ca să evităm două analize independente ale aceleiași originalități. */
  verdictFiltruAntiFals?: FiltruAntiFalsOutput | null;
}

/** Definiția agentului conform interfeței comune — vezi lib/agents/types.ts. */
export const ghidRarAgent: AgentDefinition<GhidRarInput, GhidRarOutput> = {
  id: 'ghid-rar',
  name: 'Ghidul RAR (Auto de Epocă & Traducere)',
  description:
    'Evaluează eligibilitatea RAR/FIVA pentru statutul de „vehicul istoric" (prag legal de 30 de ani + originalitate constructivă) și produce un rezumat curat în română al descrierii externe.',
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async run(input: GhidRarInput) {
    const varsta = calculeazaVarstaVehicul(input.anFabricatie);
    const varstaInsuficienta = varsta != null && varsta < VARSTA_MINIMA_RAR;
    const areTextDeAnalizat = Boolean(input.text?.trim());
    const areVerdictFiltru = Boolean(input.verdictFiltruAntiFals);

    // Scurtcircuite determinist, fără niciun apel Claude — DOAR când nu există text de
    // tradus/rezumat (traducerea rămâne utilă indiferent de eligibilitatea RAR, deci text
    // prezent = merită mereu un apel Claude, chiar dacă vârsta descalifică deja).
    if (!areTextDeAnalizat) {
      // Vârsta descalifică deja: verdictul e cert („Neeligibil"), indiferent de ce a găsit
      // Filtru Anti-Fals — și n-avem ce rezuma fără text.
      if (varstaInsuficienta) {
        return ghidRarOutputSchema.parse({
          eligibilitate_rar: 'Neeligibil',
          rezumat_ro: null,
          motiv_eligibilitate: `Vehiculul are ${varsta} ani — sub pragul legal de ${VARSTA_MINIMA_RAR} de ani pentru statutul de „vehicul istoric" (RAR/FIVA).`,
        });
      }
      // Vârstă suficientă/necunoscută, fără text ȘI fără verdict Filtru de interpretat:
      // nimic nou de analizat dincolo de vârstă.
      if (!areVerdictFiltru) {
        return ghidRarOutputSchema.parse({
          eligibilitate_rar: 'Incert',
          rezumat_ro: null,
          motiv_eligibilitate:
            varsta != null
              ? `Vehiculul are ${varsta} ani (îndeplinește pragul de vârstă), dar nu există nicio descriere de analizat pentru criteriul de originalitate constructivă.`
              : 'Anul de fabricație nu e cunoscut, deci pragul de vârstă nu poate fi verificat.',
        });
      }
      // altfel: vârstă suficientă/necunoscută + verdict Filtru prezent (dar fără text) —
      // merită un apel Claude, poate concluziona din verdictul Filtru chiar fără text propriu.
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY lipsește din variabilele de mediu.');
    const client = new Anthropic({ apiKey });
    return genereazaRaport(client, input, varsta, input.verdictFiltruAntiFals ?? null, varstaInsuficienta);
  },
};
