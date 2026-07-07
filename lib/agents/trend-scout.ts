// ============================================================
// Trend-Scout & Sentiment Analyzer — agent AI care analizează postări din
// comunități/forumuri auto (text deja colectat legal — vezi nota din
// runTrendScout) pentru a detecta modele cu interes în creștere.
//
// Separare deliberată: text_parser + keyword_counter + variația procentuală
// lună-peste-lună sunt COMPLET deterministe (TypeScript pur, fără apel
// Claude) — pragul de 20% e o decizie financiară, nu ceva de lăsat pe seama
// aritmeticii unui LLM. Singurul apel Claude e pentru partea care chiar
// necesită înțelegere de limbaj: clasificarea sentimentului (pozitiv/negativ)
// și rezumatul argumentelor din discuții.
// ============================================================
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from './types';

const MODEL = 'claude-sonnet-4-5';

// ---- Vocabular de recunoaștere per model — alias-uri colocviale, nu doar
// codul de șasiu, fiindcă pe forumuri lumea scrie „300CE"/"SL500", nu „W124". ----
const MODEL_ALIASES: Record<string, string[]> = {
  W124: ['w124', 'c124', '300ce', '300 ce', 'e320 coupe', '300e-24'],
  R129: ['r129', 'sl320', 'sl 320', 'sl500', 'sl 500', 'sl600', 'sl 600', 'sl73', 'sl 73 amg'],
  W201: ['w201', '190e', '190 e', '2.3-16', '2.5-16', 'evo ii', 'evo 2', 'sportline'],
  W126: ['w126', '500sec', '560sec', '560 sec', '560sel', '560 sel', '500sel', 'sec'],
  W123: ['w123', 'c123', '230ce', '280ce', '280 ce', '240td'],
  W140: ['w140', 's600', 'cl600', 'cl 600', 's500', 's 500', 'pullman'],
};

export interface ForumPost {
  text: string;
  /** ISO 8601 (ex: "2026-06-15") — folosită doar pentru gruparea pe lună. */
  date: string;
  source?: string;
}

// ---- text_parser — curăță și fragmentează postările (determinist) ----
export interface ParsedFragment {
  text: string;
  date: string;
  month: string; // "YYYY-MM"
  source?: string;
}

export function textParser(posts: ForumPost[]): ParsedFragment[] {
  const fragments: ParsedFragment[] = [];
  for (const post of posts) {
    const month = post.date.slice(0, 7);
    // curăță URL-uri/citate excesive, apoi fragmentează pe propoziții — un
    // model menționat de 2 ori în aceeași postare lungă contează de 2 ori,
    // nu o dată, ceea ce reflectă mai fidel volumul real de discuție.
    const cleaned = post.text
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/>\s?.*$/gm, ' ') // linii de citat stil forum ("> ...")
      .replace(/\s+/g, ' ')
      .trim();
    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.length > 3);
    for (const s of sentences) {
      fragments.push({ text: s, date: post.date, month, source: post.source });
    }
  }
  return fragments;
}

// ---- keyword_counter — frecvența mențiunilor per model per lună (determinist) ----
export interface MentionCounts {
  [modelCode: string]: { [month: string]: number };
}

export function keywordCounter(fragments: ParsedFragment[], modelCodes: string[] = Object.keys(MODEL_ALIASES)): MentionCounts {
  const counts: MentionCounts = {};
  for (const code of modelCodes) {
    counts[code] = {};
  }
  for (const frag of fragments) {
    const lower = frag.text.toLowerCase();
    for (const code of modelCodes) {
      const aliases = MODEL_ALIASES[code] ?? [code.toLowerCase()];
      if (aliases.some((alias) => lower.includes(alias))) {
        counts[code][frag.month] = (counts[code][frag.month] ?? 0) + 1;
      }
    }
  }
  return counts;
}

// ---- Variația procentuală lună-peste-lună (determinist, nu LLM) ----
export interface MonthlyTrend {
  model_code: string;
  luna_curenta: string;
  luna_precedenta: string | null;
  mentiuni_luna_curenta: number;
  mentiuni_luna_precedenta: number;
  variatie_procentuala: number | null; // null dacă nu există lună precedentă de comparat
}

/** Ia ULTIMELE 2 luni cu date disponibile per model (nu presupune lunile
 * calendaristice curente — funcționează pe orice interval din datele primite). */
export function computeMonthlyTrends(counts: MentionCounts): MonthlyTrend[] {
  const trends: MonthlyTrend[] = [];
  for (const [modelCode, byMonth] of Object.entries(counts)) {
    const months = Object.keys(byMonth).sort();
    if (!months.length) continue;
    const lunaCurenta = months[months.length - 1];
    const lunaPrecedenta = months.length >= 2 ? months[months.length - 2] : null;
    const curent = byMonth[lunaCurenta] ?? 0;
    const precedent = lunaPrecedenta ? (byMonth[lunaPrecedenta] ?? 0) : 0;
    const variatie = lunaPrecedenta && precedent > 0 ? ((curent - precedent) / precedent) * 100 : null;
    trends.push({
      model_code: modelCode,
      luna_curenta: lunaCurenta,
      luna_precedenta: lunaPrecedenta,
      mentiuni_luna_curenta: curent,
      mentiuni_luna_precedenta: precedent,
      variatie_procentuala: variatie != null ? Math.round(variatie * 10) / 10 : null,
    });
  }
  return trends;
}

const PRAG_ALERTA_PROCENT = 20;

// ---- Schema de output (zod) ----
const trendReportItemSchema = z.object({
  model_detectat: z.string(),
  directie_trend: z.enum(['crescator', 'stabil', 'scazator']),
  sentiment_net: z.enum(['pozitiv', 'negativ', 'mixt']),
  argumente_din_discutii: z.string(),
  mentiuni_luna_curenta: z.number().int(),
  mentiuni_luna_precedenta: z.number().int(),
  variatie_procentuala: z.number().nullable(),
  alerta_declansata: z.boolean(),
});

export const trendScoutReportSchema = z.object({
  raport: z.array(trendReportItemSchema),
});

export type TrendScoutReport = z.infer<typeof trendScoutReportSchema>;

const SUBMIT_REPORT_TOOL: Anthropic.Tool = {
  name: 'submit_report',
  description: 'Trimite raportul final de tendințe. Apelează O SINGURĂ DATĂ, la final.',
  input_schema: {
    type: 'object',
    properties: {
      raport: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            model_detectat: { type: 'string' },
            directie_trend: { type: 'string', enum: ['crescator', 'stabil', 'scazator'] },
            sentiment_net: { type: 'string', enum: ['pozitiv', 'negativ', 'mixt'] },
            argumente_din_discutii: { type: 'string' },
            mentiuni_luna_curenta: { type: 'integer' },
            mentiuni_luna_precedenta: { type: 'integer' },
            variatie_procentuala: { type: ['number', 'null'] },
            alerta_declansata: { type: 'boolean' },
          },
          required: [
            'model_detectat',
            'directie_trend',
            'sentiment_net',
            'argumente_din_discutii',
            'mentiuni_luna_curenta',
            'mentiuni_luna_precedenta',
            'variatie_procentuala',
            'alerta_declansata',
          ],
        },
      },
    },
    required: ['raport'],
  },
};

function buildSystemPrompt(trends: MonthlyTrend[]): string {
  const tabelTrenduri = trends
    .map(
      (t) =>
        `- ${t.model_code}: ${t.mentiuni_luna_precedenta} mențiuni în ${t.luna_precedenta ?? '(fără lună anterioară)'} → ${t.mentiuni_luna_curenta} în ${t.luna_curenta}` +
        (t.variatie_procentuala != null ? ` (variație: ${t.variatie_procentuala > 0 ? '+' : ''}${t.variatie_procentuala}%)` : ' (fără bază de comparație)')
    )
    .join('\n');

  return `## ROL
Ești un analist financiar și trendsetter specializat în piața europeană de mașini clasice de colecție.

## SCOP
Primești fragmente de discuții reale de pe forumuri/cluburi auto (text brut, deja colectat legal — nu ceri și nu presupui acces la platforme) și trebuie să determini, pentru fiecare model menționat, dacă interesul comunității crește, e stabil, sau scade.

## DATE FACTUALE DEJA CALCULATE (determinist, nu le recalcula, nu le contrazice)
Numărul de mențiuni per model, per lună, a fost deja calculat exact din text prin numărare de cuvinte-cheie:
${tabelTrenduri}

## CE TREBUIE SĂ FACI TU (partea care chiar necesită înțelegere de limbaj)
1. Pentru fiecare model din lista de mai sus, citește fragmentele de discuție relevante (ți se dau mai jos) și clasifică sentimentul NET ca:
   - **pozitiv** — oamenii cumpără, restaurează, laudă modelul, discută despre cât de mult i-a crescut valoarea;
   - **negativ** — oamenii se plâng de piese scumpe/greu de găsit, rugină generalizată, probleme mecanice frecvente;
   - **mixt** — ambele tipuri de mențiuni, fără o direcție clară.
2. Determină \`directie_trend\`: „crescator" DOAR dacă variația procentuală calculată e peste +${PRAG_ALERTA_PROCENT}% ȘI sentimentul net e pozitiv (o creștere de volum cu sentiment negativ înseamnă probleme cunoscute, nu hype de investiție — nu e „crescator"). „scazator" dacă variația e negativă sau sentimentul e clar negativ în ciuda unui volum stabil/crescut. Altfel „stabil".
3. \`alerta_declansata\` = true DOAR dacă \`directie_trend\` = „crescator" ȘI variația procentuală ≥ ${PRAG_ALERTA_PROCENT}%. NU seta true pe baza propriei tale aprecieri a volumului — folosește STRICT numărul de variație procentuală deja calculat de mai sus.
4. \`argumente_din_discutii\`: 1-2 propoziții, concrete, citând motivul real din discuții (ex: „mai mulți utilizatori menționează restaurări recente și creșterea prețurilor la licitații"), nu generic.
5. Nu inventa modele care nu apar în lista de mai sus. Nu schimba numerele de mențiuni — sunt deja corecte.

## FORMAT DE RĂSPUNS — OBLIGATORIU
Apelează \`submit_report\` cu rezultatul final. Nu răspunde cu text liber în locul acestui apel.`;
}

async function analizeazaTrenduri(client: Anthropic, fragments: ParsedFragment[], trends: MonthlyTrend[]): Promise<TrendScoutReport> {
  if (!trends.length) return { raport: [] };

  const fragmentePerModel = trends
    .map((t) => {
      const aliases = MODEL_ALIASES[t.model_code] ?? [];
      const relevante = fragments
        .filter((f) => aliases.some((a) => f.text.toLowerCase().includes(a)))
        .slice(0, 40) // limită rezonabilă per model, ca prompt-ul să nu explodeze
        .map((f) => `[${f.month}] ${f.text}`)
        .join('\n');
      return `### Fragmente pentru ${t.model_code}\n${relevante || '(niciun fragment text disponibil)'}`;
    })
    .join('\n\n');

  const response = await client.messages.create({
    model: MODEL,
    // Analiza acoperă până la 6 modele într-un singur apel (nu unul per
    // model) — plafonul de mai jos a fost mărit după un eșec real în
    // producție unde tool_use-ul a fost trunchiat (stop_reason: 'max_tokens')
    // pentru un raport cu mai multe modele calificate simultan.
    max_tokens: 8192,
    system: buildSystemPrompt(trends),
    tools: [SUBMIT_REPORT_TOOL],
    // Forțează apelul direct al tool-ului — fără asta, modelul poate emite
    // întâi un bloc de text preambul (raționament), care consumă din
    // max_tokens ÎNAINTE de tool_use și poate trunchia JSON-ul rezultatului.
    tool_choice: { type: 'tool', name: 'submit_report' },
    messages: [{ role: 'user', content: fragmentePerModel }],
  });

  const submitCall = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_report'
  );
  if (!submitCall) {
    if (response.stop_reason === 'max_tokens') {
      throw new Error('Răspunsul agentului a fost trunchiat (max_tokens) înainte de a apela submit_report.');
    }
    throw new Error('Agentul nu a apelat submit_report.');
  }

  const parsed = trendScoutReportSchema.safeParse(submitCall.input);
  if (!parsed.success) {
    const detaliu = response.stop_reason === 'max_tokens' ? ' (răspuns trunchiat: max_tokens)' : '';
    throw new Error(`Raportul Trend-Scout nu respectă formatul așteptat${detaliu}: ${parsed.error.issues[0]?.message ?? 'eroare necunoscută'}`);
  }
  return parsed.data;
}

export interface TrendScoutInput {
  posts: ForumPost[];
  /** Restrânge analiza la anumite modele — implicit toate cele din MODEL_ALIASES. */
  modelCodes?: string[];
}

/** Definiția agentului conform interfeței comune — vezi lib/agents/types.ts.
 *
 * NOTĂ LEGALĂ: acest agent NU colectează el însuși postări (nu face scraping
 * de forumuri/cluburi) — primește `posts` deja adunat prin mijloace legale
 * (căutare web obișnuită, la fel ca rutina de cercetare programată existentă),
 * la fel cum Detectivul de Autenticitate nu vizitează el însuși anunțuri, ci
 * primește descrierea. Sursa reală de date rămâne de conectat separat. */
export const trendScoutAgent: AgentDefinition<TrendScoutInput, TrendScoutReport> = {
  id: 'trend-scout',
  name: 'Trend-Scout & Sentiment Analyzer',
  description:
    'Analizează discuții din comunități auto pentru a detecta modele cu interes (hype) în creștere, pe baza volumului de mențiuni și a sentimentului net.',
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async run(input: TrendScoutInput) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY lipsește din variabilele de mediu.');

    const fragments = textParser(input.posts);
    const counts = keywordCounter(fragments, input.modelCodes);
    const trends = computeMonthlyTrends(counts).filter((t) => t.mentiuni_luna_curenta > 0);

    const client = new Anthropic({ apiKey });
    return analizeazaTrenduri(client, fragments, trends);
  },
};
