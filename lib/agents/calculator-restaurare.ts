// ============================================================
// Calculator de Restaurare — agent care ajută cumpărătorii să înțeleagă
// costul real final al unei mașini clasice (preț + transport + buget de
// reîmprospătare estetică/mecanică în România), pe baza problemelor
// menționate chiar de vânzător în descriere.
//
// Separare deliberată (același principiu ca la Filtru Anti-Fals/Ghidul RAR):
// detectarea problemelor + calculul bugetului (sumă de intervale de cost +
// revizia obligatorie de 300€) sunt 100% deterministe — un buget e o sumă
// de bani, nu se lasă pe seama aritmeticii unui LLM. Claude scrie DOAR
// `mesaj_atentionare`, folosind faptele deja calculate + cunoștințele lui
// despre punctele slabe cunoscute ale fiecărui șasiu (W123/W124/W126/W140/
// W201/R129) — parte care chiar necesită judecată tehnică specifică, nu
// doar potrivire de cuvinte.
// ============================================================
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from './types';

const MODEL = 'claude-sonnet-4-5';

interface ProblemaCunoscuta {
  eticheta: string;
  fraze: string[];
  costMin: number;
  costMax: number;
}

// Costurile sunt estimări de piață RO pentru mașini clasice — cele pentru
// climă/rugină vin exact din specificație; celelalte trei (scurgeri,
// retapițare, zgârieturi) sunt estimări proprii rezonabile pentru piața
// din România, nedate explicit — semnalate ca atare, ajustabile ulterior.
const PROBLEME_CUNOSCUTE: ProblemaCunoscuta[] = [
  {
    eticheta: 'Verificare/reparație aer condiționat (compresor)',
    fraze: [
      'aerul nu functioneaza', 'aerul nu funcționează', 'ac nu functioneaza', 'ac nu funcționează',
      'climatizarea nu functioneaza', 'climatizarea nu funcționează', 'klimaanlage defekt',
      'klima funktioniert nicht', 'air conditioning not working', 'ac not working',
    ],
    costMin: 250,
    costMax: 400,
  },
  {
    eticheta: 'Tinichigerie + vopsit parțial (puncte de rugină)',
    fraze: [
      'puncte de rugina', 'puncte de rugină', 'rugina', 'rugină', 'rostschäden', 'rostig', 'rusty spots',
    ],
    costMin: 400,
    costMax: 800,
  },
  {
    eticheta: 'Reparație scurgeri (garnituri motor/cutie de viteze)',
    fraze: ['scurgeri de ulei', 'pierde ulei', 'oil leak', 'ölverlust', 'öl verliert', 'leaking oil'],
    costMin: 300,
    costMax: 600,
  },
  {
    eticheta: 'Retapițare profesională a interiorului',
    fraze: ['retapitat', 'retapițat', 'neu gepolstert', 'reupholstered', 'interior refăcut'],
    costMin: 600,
    costMax: 1200,
  },
  {
    eticheta: 'Polish / retuș vopsea (zgârieturi)',
    fraze: ['zgarieturi', 'zgârieturi', 'kratzer', 'scratches'],
    costMin: 150,
    costMax: 350,
  },
];

/** Revizie completă (filtre, fluide specifice cutie automată youngtimer) —
 * OBLIGATORIE, se adaugă mereu, indiferent ce altceva s-a detectat în text. */
const REVIZIE_OBLIGATORIE = {
  eticheta: 'Revizie completă obligatorie (filtre, fluide specifice cutie automată youngtimer)',
  cost: 300,
};

export interface ProblemaDetectata {
  eticheta: string;
  costMin: number;
  costMax: number;
}

export function detecteazaProbleme(text: string): ProblemaDetectata[] {
  const lower = text.toLowerCase();
  return PROBLEME_CUNOSCUTE.filter((p) => p.fraze.some((f) => lower.includes(f))).map((p) => ({
    eticheta: p.eticheta,
    costMin: p.costMin,
    costMax: p.costMax,
  }));
}

export interface BugetCalculat {
  min: number;
  max: number;
}

/** Suma intervalelor problemelor detectate + revizia obligatorie — mereu prezentă. */
export function calculeazaBuget(probleme: ProblemaDetectata[]): BugetCalculat {
  const min = probleme.reduce((acc, p) => acc + p.costMin, REVIZIE_OBLIGATORIE.cost);
  const max = probleme.reduce((acc, p) => acc + p.costMax, REVIZIE_OBLIGATORIE.cost);
  return { min, max };
}

export function formateazaBuget(buget: BugetCalculat): string {
  const f = (n: number) => n.toLocaleString('ro-RO');
  return `${f(buget.min)}€ - ${f(buget.max)}€`;
}

function construiesteDetaliereNecesitati(probleme: ProblemaDetectata[]): string[] {
  return [...probleme.map((p) => p.eticheta), REVIZIE_OBLIGATORIE.eticheta];
}

// ---- Schema de output ----
export const calculatorRestaurareOutputSchema = z.object({
  buget_reimprospatare_estimat: z.string(),
  detaliere_necesitati: z.array(z.string()),
  mesaj_atentionare: z.string(),
});
export type CalculatorRestaurareOutput = z.infer<typeof calculatorRestaurareOutputSchema>;

const SUBMIT_REPORT_TOOL: Anthropic.Tool = {
  name: 'submit_report',
  description: 'Trimite sfatul tehnic final. Apelează O SINGURĂ DATĂ, la final.',
  input_schema: {
    type: 'object',
    properties: {
      mesaj_atentionare: { type: 'string' },
    },
    required: ['mesaj_atentionare'],
  },
};

function buildSystemPrompt(modelCode: string, text: string, probleme: ProblemaDetectata[], buget: BugetCalculat): string {
  const listaProbleme = probleme.length
    ? probleme.map((p) => `- ${p.eticheta} (${p.costMin}-${p.costMax}€)`).join('\n')
    : '(niciun cuvânt-cheie de problemă detectat determinist în text)';

  return `## ROL
Ești un expert restaurator Mercedes-Benz clasic, specializat în bugetarea reală a reîmprospătării unei mașini cumpărate din import — ajuți cumpărătorul să știe la ce costuri suplimentare să se aștepte după preț și transport.

## MODEL ANALIZAT
${modelCode}

## TEXTUL ANUNȚULUI
${text}

## FAPTE DEJA CALCULATE DETERMINIST (bază sigură — buget în EUR, nu le recalcula)
Probleme detectate din text:
${listaProbleme}
- Revizie completă obligatorie (filtre, fluide specifice cutie automată youngtimer): ${REVIZIE_OBLIGATORIE.cost}€ (mereu inclusă)
Buget total estimat: ${formateazaBuget(buget)}

## CE TREBUIE SĂ FACI TU
Scrie \`mesaj_atentionare\` — 2-4 propoziții, în română, stil sfat tehnic direct (nu generic de marketing):
- dacă există probleme detectate mai sus, menționează-le concret și ce înseamnă practic pentru cumpărător;
- adaugă și cel puțin un punct slab CUNOSCUT specific pentru ${modelCode} (folosește propriile tale cunoștințe despre acest șasiu — ex. suspensie pneumatică, rugină la praguri/aripi, hidraulică plafon/capotă, cutii automate specifice — orice e relevant și documentat pentru acest model, nu inventa);
- nu recalcula bugetul de mai sus, doar explică-l.

## FORMAT DE RĂSPUNS — OBLIGATORIU
Apelează \`submit_report\` cu rezultatul final. Nu răspunde cu text liber în locul acestui apel.`;
}

async function genereazaAtentionare(
  client: Anthropic,
  modelCode: string,
  text: string,
  probleme: ProblemaDetectata[],
  buget: BugetCalculat
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(modelCode, text, probleme, buget),
    tools: [SUBMIT_REPORT_TOOL],
    messages: [{ role: 'user', content: 'Generează sfatul tehnic.' }],
  });

  const submitCall = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_report'
  );
  if (!submitCall) throw new Error('Agentul nu a apelat submit_report.');

  const parsed = z.object({ mesaj_atentionare: z.string() }).parse(submitCall.input);
  return parsed.mesaj_atentionare;
}

export interface CalculatorRestaurareInput {
  modelCode: string;
  text: string | null;
}

/** Definiția agentului conform interfeței comune — vezi lib/agents/types.ts. */
export const calculatorRestaurareAgent: AgentDefinition<CalculatorRestaurareInput, CalculatorRestaurareOutput> = {
  id: 'calculator-restaurare',
  name: 'Calculator de Restaurare',
  description:
    'Detectează probleme menționate în descriere (climă, rugină, scurgeri, retapițare, zgârieturi) și estimează bugetul real de reîmprospătare, cu sfat tehnic specific modelului.',
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async run(input: CalculatorRestaurareInput) {
    const text = input.text?.trim();
    if (!text) throw new Error('Nu există text de analizat.');

    const probleme = detecteazaProbleme(text);
    const buget = calculeazaBuget(probleme);
    const detaliere = construiesteDetaliereNecesitati(probleme);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY lipsește din variabilele de mediu.');
    const client = new Anthropic({ apiKey });
    const mesaj = await genereazaAtentionare(client, input.modelCode, text, probleme, buget);

    return calculatorRestaurareOutputSchema.parse({
      buget_reimprospatare_estimat: formateazaBuget(buget),
      detaliere_necesitati: detaliere,
      mesaj_atentionare: mesaj,
    });
  },
};
