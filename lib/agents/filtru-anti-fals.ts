// ============================================================
// Filtru Anti-Fals (Replica Detector) — agent AI specializat în detectarea
// anunțurilor care revendică o variantă flagship (AMG, V8, V12, Evo) dar al
// căror text dezvăluie o altă motorizare/an, sau menționează explicit un
// pachet montat ulterior / o conversie / o insignă doar de aspect.
//
// Separare deliberată: corelarea insignă-revendicată ↔ specificația reală de
// fabrică (cilindree, combustibil, ani de producție) e determinist — se
// bazează pe o listă factuală de variante flagship cunoscute, nu pe
// „memoria” unui LLM. Claude primește aceste fapte ca bază GARANTATĂ, dar
// spre deosebire de Trend-Scout (unde un prag financiar nu se recalculează
// niciodată), aici Claude poate adăuga propriile lui cunoștințe despre
// istoria Mercedes-Benz — lista noastră de variante e utilă, nu exhaustivă,
// iar clasificarea finală (Original/Modificat/Replică/Suspicios) și alerta
// de preț necesită oricum judecată contextuală, nu doar potrivire de fapte.
// ============================================================
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from './types';

const MODEL = 'claude-sonnet-4-5';

// ---- Bază factuală: variante flagship cunoscute per model țintă ----
interface VariantaFlagship {
  insigne: string[];
  capacitateLitri: number;
  combustibil: 'benzina';
  motorLabel: string;
  aniProductie: [number, number];
}

const FLAGSHIP_VARIANTS: Record<string, VariantaFlagship[]> = {
  W124: [
    { insigne: ['500e', 'e500', '500 e'], capacitateLitri: 5.0, combustibil: 'benzina', motorLabel: 'M119, V8 5.0L (4973cc), ~326 CP', aniProductie: [1990, 1995] },
    { insigne: ['e60 amg', '300e amg', 'e36 amg'], capacitateLitri: 3.6, combustibil: 'benzina', motorLabel: 'M104 modificat AMG „E36", ~272 CP', aniProductie: [1988, 1995] },
  ],
  W126: [
    { insigne: ['560sec', '560 sec'], capacitateLitri: 5.6, combustibil: 'benzina', motorLabel: 'M117, V8 5.6L (5547cc), ~300 CP', aniProductie: [1985, 1991] },
    { insigne: ['560sel', '560 sel'], capacitateLitri: 5.6, combustibil: 'benzina', motorLabel: 'M117, V8 5.6L (5547cc), ~300 CP', aniProductie: [1985, 1991] },
  ],
  W140: [
    { insigne: ['600sel', 's600', 'cl600', '600 sel', 'cl 600'], capacitateLitri: 6.0, combustibil: 'benzina', motorLabel: 'M120, V12 6.0L (5987cc), ~394 CP', aniProductie: [1991, 1998] },
  ],
  W201: [
    { insigne: ['2.5-16 evo ii', '2.5-16 evo 2', '190e evo ii', 'evo ii'], capacitateLitri: 2.5, combustibil: 'benzina', motorLabel: 'M102 EVO II, I4 2.5L 16v (2463cc), ~235 CP', aniProductie: [1990, 1991] },
    { insigne: ['2.5-16 evo', '190e evo'], capacitateLitri: 2.5, combustibil: 'benzina', motorLabel: 'M102 EVO, I4 2.5L 16v (2463cc), ~197 CP', aniProductie: [1989, 1990] },
  ],
  R129: [
    { insigne: ['sl73 amg', 'sl 73 amg', 'sl73'], capacitateLitri: 7.3, combustibil: 'benzina', motorLabel: 'M120 (AMG), V12 7.3L (7291cc), ~525 CP', aniProductie: [1999, 2001] },
    { insigne: ['sl600', 'sl 600'], capacitateLitri: 6.0, combustibil: 'benzina', motorLabel: 'M120, V12 6.0L (5987cc), ~394 CP', aniProductie: [1993, 2001] },
  ],
  W123: [], // niciodată o variantă de fabrică AMG/V8/V12 — vezi verificaCorelatieBadge
};

// ---- text_parser tehnic — extrage cifre/indicii declarate în text (determinist) ----
export interface IndiciiTehnice {
  capacitateLitri: number | null;
  combustibil: 'benzina' | 'diesel' | null;
  cilindri: string | null;
}

export function extrageIndiciiTehnice(text: string): IndiciiTehnice {
  const lower = text.toLowerCase();

  const capacitateMatch = lower.match(/(\d[.,]\d)\s*(?:litri|l\b)/) || lower.match(/\b(\d{4})\s*cc\b/);
  let capacitateLitri: number | null = null;
  if (capacitateMatch) {
    const bruta = capacitateMatch[1].replace(',', '.');
    capacitateLitri = bruta.length >= 3 && !bruta.includes('.') ? Number(bruta) / 1000 : Number(bruta);
  }

  const combustibil = /diesel|tdi|cdi/.test(lower) ? 'diesel' : /benzin[ăa]|petrol|essence/.test(lower) ? 'benzina' : null;
  const cilindriMatch = lower.match(/\bv(6|8|12)\b/) || lower.match(/\bi(4|6)\b/);
  const cilindri = cilindriMatch ? cilindriMatch[0].toUpperCase() : null;

  return { capacitateLitri, combustibil, cilindri };
}

// ---- keyword_counter — sintagme suspecte cunoscute (determinist) ----
const SINTAGME_SUSPECTE: { fraze: string[]; eticheta: string }[] = [
  { fraze: ['pachet amg aplicat ulterior', 'pachet amg montat ulterior', 'kit amg montat', 'styling amg', 'look amg', 'aspect amg'], eticheta: 'Menționează un pachet AMG montat ulterior / doar de aspect, nu de fabrică' },
  { fraze: ['conversie facelift', 'conversie la facelift', 'transformat facelift'], eticheta: 'Menționează o conversie de facelift (schimbare de aspect exterior față de originalul de fabrică)' },
  { fraze: ['badge de 500', 'insignă de 500', 'insigna de 500', 'emblemă 500 pusă', 'emblema 500 pusa', 'emblemă montată', 'emblema montata', 'badge pentru aspect', 'emblemă pentru aspect'], eticheta: 'Menționează o insignă/emblemă montată doar pentru aspect, nu corespunde motorului real' },
  { fraze: ['bodykit', 'body kit', 'kit exterior'], eticheta: 'Menționează un kit exterior (bodykit) — posibil aspect modificat față de original' },
  { fraze: ['motor schimbat', 'swap motor', 'motor înlocuit', 'motor inlocuit'], eticheta: 'Menționează un motor schimbat/swap — posibil nu mai e configurația originală' },
];

export function detecteazaSintagmeSuspecte(text: string): string[] {
  const lower = text.toLowerCase();
  return SINTAGME_SUSPECTE.filter((s) => s.fraze.some((f) => lower.includes(f))).map((s) => s.eticheta);
}

// ---- verificarea de corelație model/insignă/spec — determinist ----
export interface RezultatCorelatie {
  insignaRevendicata: string | null;
  variantaCunoscuta: VariantaFlagship | null;
  conflicteTehnice: string[];
}

export function verificaCorelatieBadge(modelCode: string, textComplet: string, an: number | null): RezultatCorelatie {
  const lower = textComplet.toLowerCase();
  const conflicteTehnice: string[] = [];

  if (modelCode === 'W123' && /\bamg\b/.test(lower)) {
    conflicteTehnice.push('W123 nu a avut niciodată o variantă de fabrică AMG — orice insignă de acest tip e cu certitudine un montaj ulterior sau o replică.');
  }

  const variante = FLAGSHIP_VARIANTS[modelCode] ?? [];
  for (const varianta of variante) {
    const insignaGasita = varianta.insigne.find((i) => lower.includes(i));
    if (!insignaGasita) continue;

    const indicii = extrageIndiciiTehnice(textComplet);
    if (indicii.capacitateLitri != null && Math.abs(indicii.capacitateLitri - varianta.capacitateLitri) > 0.3) {
      conflicteTehnice.push(
        `Anunțul revendică insigna „${insignaGasita}" (necesită ${varianta.motorLabel}), dar textul menționează o capacitate de ${indicii.capacitateLitri}L — nepotrivire clară.`
      );
    }
    if (indicii.combustibil && indicii.combustibil !== varianta.combustibil) {
      conflicteTehnice.push(
        `Insigna „${insignaGasita}" corespunde unui motor pe benzină, dar textul menționează motorizare ${indicii.combustibil}.`
      );
    }
    if (an != null && (an < varianta.aniProductie[0] || an > varianta.aniProductie[1])) {
      conflicteTehnice.push(
        `Anul declarat (${an}) e în afara perioadei reale de fabricație (${varianta.aniProductie[0]}-${varianta.aniProductie[1]}) pentru „${insignaGasita}".`
      );
    }

    return { insignaRevendicata: insignaGasita, variantaCunoscuta: varianta, conflicteTehnice };
  }

  return { insignaRevendicata: null, variantaCunoscuta: null, conflicteTehnice };
}

// ---- Schema de output ----
export const filtruAntiFalsOutputSchema = z.object({
  autenticitate_pachet: z.enum(['Original', 'Modificat', 'Replica', 'Suspicios']),
  alerta_frauda_pret: z.boolean(),
  nota_explicativa: z.string(),
  semnale_detectate: z.array(z.string()).default([]),
});
export type FiltruAntiFalsOutput = z.infer<typeof filtruAntiFalsOutputSchema>;

const SUBMIT_REPORT_TOOL: Anthropic.Tool = {
  name: 'submit_report',
  description: 'Trimite verdictul final de autenticitate a pachetului. Apelează O SINGURĂ DATĂ, la final.',
  input_schema: {
    type: 'object',
    properties: {
      autenticitate_pachet: { type: 'string', enum: ['Original', 'Modificat', 'Replica', 'Suspicios'] },
      alerta_frauda_pret: { type: 'boolean' },
      nota_explicativa: { type: 'string' },
    },
    required: ['autenticitate_pachet', 'alerta_frauda_pret', 'nota_explicativa'],
  },
};

function buildSystemPrompt(
  input: FiltruAntiFalsInput,
  insignaRevendicata: string | null,
  variantaCunoscuta: VariantaFlagship | null,
  semnaleDeterministe: string[]
): string {
  const faptaInsigna = insignaRevendicata && variantaCunoscuta
    ? `Insignă/variantă revendicată în anunț: „${insignaRevendicata}" — spec reală de fabrică: ${variantaCunoscuta.motorLabel}, produsă ${variantaCunoscuta.aniProductie[0]}-${variantaCunoscuta.aniProductie[1]}.`
    : 'Nicio insignă de variantă flagship cunoscută nu a fost detectată explicit în text.';
  const listaSemnale = semnaleDeterministe.length
    ? semnaleDeterministe.map((s) => `- ${s}`).join('\n')
    : '(nicio nepotrivire tehnică sau sintagmă suspectă detectată determinist)';

  return `## ROL
Ești „Filtru Anti-Fals (Replica Detector)" — un expert restaurator Mercedes-Benz specializat în identificarea replicilor și pachetelor de aspect false pe modelele clasice (W123, W124, W126, W140, W201, R129). Cumpărătorii se bazează pe tine ca să nu plătească preț de model rar/flagship (AMG, V8, V12, Evo) pe o mașină care e de fapt o versiune de bază cu insignă schimbată.

## ANUNȚUL ANALIZAT
Model: ${input.modelCode}
Titlu: ${input.titlu}
Preț cerut: ${input.pret} EUR
An declarat: ${input.an ?? 'nespecificat'}
Text: ${input.text ?? '(fără text suplimentar)'}

## FAPTE DEJA VERIFICATE DETERMINIST (bază sigură, garantată — nu le contrazice)
${faptaInsigna}
${listaSemnale}

## CE TREBUIE SĂ FACI TU
Lista de mai sus e un minim garantat, nu exhaustiv — poți adăuga și alte nepotriviri tehnice sau semnale pe care le identifici singur din text, folosind propriile tale cunoștințe despre istoria Mercedes-Benz, dar explică-le clar în nota finală dacă le folosești.

Clasifică \`autenticitate_pachet\`:
- „Original" — nicio insignă de top revendicată, sau insigna corespunde perfect cu specificațiile reale.
- „Modificat" — vânzătorul RECUNOAȘTE explicit că insigna/pachetul e o conversie/adăugire ulterioară (onest, nu ascunde nimic).
- „Suspicios" — există nepotriviri tehnice, dar formularea e ambiguă/incompletă, fără o recunoaștere clară a vânzătorului.
- „Replică" — anunțul revendică ferm o variantă flagship originală, dar faptele arată clar că nu poate fi originală.

Setează \`alerta_frauda_pret\` = true DOAR dacă prețul cerut pare aliniat cu valoarea unei variante flagship ORIGINALE, în ciuda nepotrivirilor găsite (adică vânzătorul cere bani de original pe ceva ce nu e). Dacă prețul e deja unul de mașină obișnuită/modificată, nu seta alerta.

Scrie \`nota_explicativa\` — 2-4 propoziții, concrete, în română, care explică EXACT ce nu se potrivește în descrierea vânzătorului.

## FORMAT DE RĂSPUNS — OBLIGATORIU
Apelează \`submit_report\` cu rezultatul final. Nu răspunde cu text liber în locul acestui apel.`;
}

async function genereazaVerdict(
  client: Anthropic,
  input: FiltruAntiFalsInput,
  insignaRevendicata: string | null,
  variantaCunoscuta: VariantaFlagship | null,
  semnaleDeterministe: string[]
): Promise<Omit<FiltruAntiFalsOutput, 'semnale_detectate'>> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(input, insignaRevendicata, variantaCunoscuta, semnaleDeterministe),
    tools: [SUBMIT_REPORT_TOOL],
    messages: [{ role: 'user', content: 'Analizează anunțul și trimite verdictul.' }],
  });

  const submitCall = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_report'
  );
  if (!submitCall) throw new Error('Agentul nu a apelat submit_report.');

  return z
    .object({
      autenticitate_pachet: z.enum(['Original', 'Modificat', 'Replica', 'Suspicios']),
      alerta_frauda_pret: z.boolean(),
      nota_explicativa: z.string(),
    })
    .parse(submitCall.input);
}

export interface FiltruAntiFalsInput {
  modelCode: string;
  titlu: string;
  text: string | null;
  pret: number;
  an: number | null;
}

/** Definiția agentului conform interfeței comune — vezi lib/agents/types.ts.
 *
 * Optimizare de cost: dacă verificarea determinist NU găsește nicio insignă
 * flagship revendicată și nicio sintagmă suspectă, agentul întoarce direct
 * „Original” fără niciun apel Claude — majoritatea anunțurilor (modele de
 * bază) nu au nimic de analizat aici, nu are rost să plătim un apel LLM. */
export const filtruAntiFalsAgent: AgentDefinition<FiltruAntiFalsInput, FiltruAntiFalsOutput> = {
  id: 'filtru-anti-fals',
  name: 'Filtru Anti-Fals (Replica Detector)',
  description:
    'Detectează anunțuri care revendică o variantă flagship (AMG, V8, V12, Evo) dar al căror text dezvăluie o altă motorizare/an, sau un pachet montat ulterior.',
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async run(input: FiltruAntiFalsInput) {
    const textComplet = `${input.titlu}. ${input.text ?? ''}`.trim();
    const { insignaRevendicata, variantaCunoscuta, conflicteTehnice } = verificaCorelatieBadge(input.modelCode, textComplet, input.an);
    const sintagmeSuspecte = detecteazaSintagmeSuspecte(textComplet);
    const semnaleDeterministe = [...conflicteTehnice, ...sintagmeSuspecte];

    if (!insignaRevendicata && !semnaleDeterministe.length) {
      return filtruAntiFalsOutputSchema.parse({
        autenticitate_pachet: 'Original',
        alerta_frauda_pret: false,
        nota_explicativa: 'Nicio insignă de variantă flagship sau sintagmă suspectă detectată în text.',
        semnale_detectate: [],
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY lipsește din variabilele de mediu.');
    const client = new Anthropic({ apiKey });
    const verdict = await genereazaVerdict(client, input, insignaRevendicata, variantaCunoscuta, semnaleDeterministe);

    return filtruAntiFalsOutputSchema.parse({ ...verdict, semnale_detectate: semnaleDeterministe });
  },
};
