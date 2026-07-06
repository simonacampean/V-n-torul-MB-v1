// ============================================================
// Detectivul de Autenticitate — agent AI care analizează descrierile
// textuale ale anunțurilor auto pentru semnale de fraudă/ascundere a
// defectelor. Port TypeScript al prototipului Python din
// agents/detectiv_autenticitate/ (păstrat acolo ca referință/prototip
// standalone) — Vercel nu poate rula ușor un subprocess Python în
// producție, deci integrarea reală în fluxul de import se face aici,
// cu ACEEAȘI persona/logică de analiză, nu reinventată.
// ============================================================
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentDefinition } from './types';

const MODEL = 'claude-sonnet-4-5';
const MAX_TOOL_ROUNDS = 8;

// ---- Persona + logica de analiză (identică cu system_prompt.py) ----
const SYSTEM_PROMPT = `## ROL
Ești un expert restaurator și istoric auto specializat în mașini clasice europene \
(în principal Mercedes-Benz W123/W124/W126/W140, R129, W201, dar și alte mărci clasice). \
Ai 30+ ani de experiență în evaluarea autenticității, restaurări „matching numbers” și \
depistarea tentativelor de a ascunde defecte sau de a induce în eroare cumpărătorii în \
anunțuri de vânzare.

## SCOP
Primești textul unei descrieri de anunț (posibil în germană, italiană, franceză, engleză \
sau română) și trebuie să produci:
1. Un scor de risc de la 1 (anunț de încredere, fără semnale de alarmă) la 10 (risc foarte \
   ridicat de fraudă/ascundere a unor defecte majore).
2. O listă de puncte critice detectate — fiecare cu explicația exactă a contradicției sau \
   suspiciunii, nu doar o etichetă generică.
3. O listă de întrebări pe care cumpărătorul ar trebui să le pună vânzătorului, formulate \
   direct și punctual, ca să elimine ambiguitatea găsită.

## UNELTE DISPONIBILE
- \`translation_tool\`: dacă textul nu e în română sau engleză, folosește-l ÎNTÂI ca să obții \
  o traducere fidelă înainte de analiză — nu ghici sensul unor termeni tehnici auto pe care \
  nu îi recunoști cu certitudine în limba sursă.
- \`regex_vin_matcher\`: rulează-l pe textul original (nu pe traducere, ca să nu pierzi \
  formatarea exactă a codurilor) ca să extragi orice cod de șasiu (VIN/Fahrgestellnummer) \
  sau cod de motor (Motornummer) menționat explicit. Folosește rezultatul ca bază factuală \
  pentru verificarea „matching numbers”, nu presupune niciodată un cod care nu apare în text.

## LOGICA DE ANALIZĂ — CE CAUȚI EXPLICIT
Caută contradicții interne, nu doar cuvinte-cheie izolate. Exemple de tipare de urmărit \
(lista e ilustrativă, nu exhaustivă — aplică același raționament la orice altă contradicție \
pe care o observi):

1. **Vopsea vs. istoric de restaurare**: „vopsea originală de fabrică” combinat cu mențiuni \
   de restaurare completă, refacere caroserie, sau reparații majore de tinichigerie.
2. **Matching numbers vs. cod de motor**: anunțul revendică „matching numbers” dar codul de \
   motor extras nu corespunde seriei așteptate, sau textul menționează un motor „de schimb”.
3. **Kilometraj scăzut vs. piese de uzură înlocuite**: kilometraj foarte mic combinat cu \
   înlocuirea unor piese care nu se schimbă decât la uzură/accident (bord, plafon, praguri).
4. **„Fără rugină” vs. semnale de coroziune**: „fără rugină” combinat cu „tratament \
   anticorosiv recent” sau „praguri sudate”.
5. **Documentație incompletă contrazisă de afirmații ferme**: „istoric complet de service” \
   dar facturile sunt descrise ca „parțiale”/„pierdute parțial”.
6. **Preț mult sub piață fără nicio explicație plauzibilă**.
7. **Limbaj vag/evitant pe puncte cheie**: „cred că”, „din câte știu”, repetat sistematic \
   exact pe subiectele critice (motor, caroserie, kilometraj).

Nu inventa suspiciuni care nu au bază în text — dacă textul e curat și consistent, scorul \
de risc trebuie să fie mic (1-3) și lista de puncte critice poate fi goală.

## FORMAT DE RĂSPUNS — OBLIGATORIU
Când ai terminat analiza, apelează unealta \`submit_report\` cu rezultatul final structurat. \
Nu răspunde cu text liber în locul acestui apel.`;

// ---- Schema de output (zod, echivalentul Pydantic din schemas.py) ----
const categorii = [
  'vopsea_restaurare',
  'matching_numbers',
  'kilometraj',
  'rugina_coroziune',
  'documentatie',
  'pret',
  'limbaj_evitant',
  'altul',
] as const;

const punctCriticSchema = z.object({
  categorie: z.enum(categorii),
  descriere: z.string(),
  severitate: z.enum(['scazuta', 'medie', 'ridicata']),
});

export const raportAutenticitateSchema = z.object({
  scor_risc: z.number().int().min(1).max(10),
  puncte_critice_detectate: z.array(punctCriticSchema).default([]),
  intrebari_de_pus_vanzatorului: z.array(z.string()).default([]),
  limba_originala_detectata: z.string().nullable().optional(),
  coduri_extrase: z.record(z.string(), z.unknown()).default({}),
});

export type RaportAutenticitate = z.infer<typeof raportAutenticitateSchema>;

const SUBMIT_REPORT_TOOL: Anthropic.Tool = {
  name: 'submit_report',
  description:
    'Trimite raportul final de autenticitate. Apelează această unealtă O SINGURĂ DATĂ, la finalul analizei — nu răspunde cu text liber în locul ei.',
  input_schema: {
    type: 'object',
    properties: {
      scor_risc: { type: 'integer', minimum: 1, maximum: 10 },
      puncte_critice_detectate: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            categorie: { type: 'string', enum: categorii as unknown as string[] },
            descriere: { type: 'string' },
            severitate: { type: 'string', enum: ['scazuta', 'medie', 'ridicata'] },
          },
          required: ['categorie', 'descriere', 'severitate'],
        },
      },
      intrebari_de_pus_vanzatorului: { type: 'array', items: { type: 'string' } },
      limba_originala_detectata: { type: ['string', 'null'] },
      coduri_extrase: { type: 'object' },
    },
    required: ['scor_risc', 'puncte_critice_detectate', 'intrebari_de_pus_vanzatorului'],
  },
};

// ---- regex_vin_matcher — extragere coduri șasiu/motor, fără apel de rețea ----
const VIN_ISO_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
const MB_CHASSIS_RE = /\b\d{3}\.\d{3}-\d{2}-\d{5,8}\b/g;
const LABELED_CHASSIS_RE =
  /(?:fahrgestellnummer|numero\s+di\s+telaio|num[ée]ro\s+de\s+ch[âa]ssis|chassis\s*(?:number|no\.?)?|serie\s+ș?asiu)\s*[:\-]?\s*([A-Z0-9][A-Z0-9.\-]{4,19})/gi;
const LABELED_ENGINE_RE =
  /(?:motornummer|numero\s+di\s+motore|num[ée]ro\s+de\s+moteur|engine\s*(?:number|no\.?)?|serie\s+motor)\s*[:\-]?\s*([A-Z0-9][A-Z0-9.\-]{4,19})/gi;

function matchAll(re: RegExp, text: string, group = 0): string[] {
  return [...text.matchAll(re)].map((m) => m[group].trim().replace(/^[.\-]+|[.\-]+$/g, ''));
}

export function regexVinMatcher(text: string) {
  return {
    vin_iso: matchAll(VIN_ISO_RE, text),
    mercedes_chassis_code: matchAll(MB_CHASSIS_RE, text),
    labeled_chassis_number: matchAll(LABELED_CHASSIS_RE, text, 1),
    labeled_engine_number: matchAll(LABELED_ENGINE_RE, text, 1),
  };
}

const REGEX_VIN_MATCHER_TOOL: Anthropic.Tool = {
  name: 'regex_vin_matcher',
  description:
    'Extrage din textul original (nu din traducere) orice cod de șasiu (VIN/Fahrgestellnummer) sau cod de motor (Motornummer) menționat explicit. Rulează o singură dată, la începutul analizei.',
  input_schema: {
    type: 'object',
    properties: { text: { type: 'string', description: 'Textul original al anunțului.' } },
    required: ['text'],
  },
};

// ---- translation_tool — traducere literală printr-un apel Claude dedicat ----
const TRANSLATION_SYSTEM_PROMPT =
  'Ești un traducător tehnic specializat în anunțuri auto. Traduci EXACT, fără să adaugi, ' +
  'omiți sau interpretezi nimic. Nu comenta, nu adăuga context. Răspunde DOAR cu textul tradus.';

async function translationTool(client: Anthropic, text: string, targetLanguage = 'română'): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: TRANSLATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Tradu în ${targetLanguage}:\n\n${text}` }],
  });
  return response.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
}

const TRANSLATION_TOOL_SCHEMA: Anthropic.Tool = {
  name: 'translation_tool',
  description:
    'Traduce un text din germană, italiană sau franceză în română. Folosește-o ÎNTÂI, înainte de analiză, dacă textul original nu e în română sau engleză.',
  input_schema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Textul de tradus.' },
      target_language: { type: 'string', description: "Limba țintă (implicit 'română').", default: 'română' },
    },
    required: ['text'],
  },
};

// ---- Orchestrarea agentului ----
async function analizeaza(client: Anthropic, descriereAnunt: string): Promise<RaportAutenticitate> {
  const tools = [TRANSLATION_TOOL_SCHEMA, REGEX_VIN_MATCHER_TOOL, SUBMIT_REPORT_TOOL];
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: descriereAnunt }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!toolUses.length) continue; // modelul a răspuns cu text liber — nu presupunem format, continuăm bucla

    const submitCall = toolUses.find((b) => b.name === 'submit_report');
    if (submitCall) return raportAutenticitateSchema.parse(submitCall.input);

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const call of toolUses) {
      let content: string;
      if (call.name === 'regex_vin_matcher') {
        content = JSON.stringify(regexVinMatcher((call.input as { text: string }).text));
      } else if (call.name === 'translation_tool') {
        const input = call.input as { text: string; target_language?: string };
        content = await translationTool(client, input.text, input.target_language);
      } else {
        content = `Unealtă necunoscută: ${call.name}`;
      }
      toolResults.push({ type: 'tool_result', tool_use_id: call.id, content });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error(`Agentul nu a apelat submit_report în ${MAX_TOOL_ROUNDS} runde.`);
}

export interface DetectivInput {
  descriere: string;
}

/** Definiția agentului conform interfeței comune (vezi lib/agents/types.ts) —
 * așa se înregistrează în lib/agents/registry.ts și devine apelabil prin orchestrator. */
export const detectivAutenticitateAgent: AgentDefinition<DetectivInput, RaportAutenticitate> = {
  id: 'detectiv-autenticitate',
  name: 'Detectivul de Autenticitate',
  description:
    'Analizează descrierile textuale ale anunțurilor auto și identifică semnale de alarmă, neconcordanțe istorice sau limbaj evitant.',
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async run(input: DetectivInput) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY lipsește din variabilele de mediu.');
    const client = new Anthropic({ apiKey });
    return analizeaza(client, input.descriere);
  },
};
