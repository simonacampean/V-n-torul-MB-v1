// Orchestratorul central — punctul unic prin care orice cod din aplicație
// rulează un agent AI. Două responsabilități:
// 1. runAgent() — rulează UN agent, cronometrat, și loghează execuția în
//    agent_runs (sursa de adevăr pentru panoul admin „AI Agents").
// 2. runPipeline() — înlănțuie mai mulți agenți, pasând output-ul unuia ca
//    input la următorul (cu o mapare opțională, fiindcă agenți diferiți au
//    forme de input/output diferite). Scaffold pregătit pentru agenții
//    viitori — azi există un singur agent înregistrat, dar mecanismul de
//    înlănțuire e complet funcțional, nu doar un stub.
//
// Eșecul de logare (agent_runs.insert) nu trebuie să mascheze rezultatul
// real al agentului — se înghite separat, la fel ca lib/audit.ts.
import { createAdminClient } from '@/lib/supabase/admin';
import { AGENT_REGISTRY } from './registry';

export type AgentRunResult<TOutput> = { ok: true; data: TOutput } | { ok: false; error: string };

export interface RunAgentOptions {
  /** De unde a fost declanșată rularea — ex. „import_oferte", „anunt_nativ", „manual_admin". */
  triggerSource: string;
  /** Leagă rularea de un anunț anume (offers.id), dacă e cazul — util pentru audit/debugging. */
  relatedOfferId?: string;
  /** Leagă rularea de un anunț salvat personal (watchlist_items.id) — pt. agenți care operează pe Lista mea. */
  relatedWatchlistItemId?: string;
}

async function logRun(params: {
  agentId: string;
  triggerSource: string;
  status: 'success' | 'error';
  input: unknown;
  output?: unknown;
  errorMessage?: string;
  durationMs: number;
  relatedOfferId?: string;
  relatedWatchlistItemId?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('agent_runs').insert({
      agent_id: params.agentId,
      trigger_source: params.triggerSource,
      status: params.status,
      input: params.input ?? null,
      output: params.output ?? null,
      error_message: params.errorMessage ?? null,
      duration_ms: params.durationMs,
      related_offer_id: params.relatedOfferId ?? null,
      related_watchlist_item_id: params.relatedWatchlistItemId ?? null,
    });
  } catch {
    // intenționat: logarea nu trebuie să blocheze fluxul real al agentului
  }
}

/** Rulează UN agent din registry, cronometrat, cu rezultatul logat în agent_runs. */
export async function runAgent<TInput, TOutput>(
  agentId: string,
  input: TInput,
  opts: RunAgentOptions
): Promise<AgentRunResult<TOutput>> {
  const agent = AGENT_REGISTRY[agentId];
  if (!agent) return { ok: false, error: `Agent necunoscut: ${agentId}` };

  const start = Date.now();
  try {
    const output = (await agent.run(input)) as TOutput;
    await logRun({
      agentId,
      triggerSource: opts.triggerSource,
      status: 'success',
      input,
      output,
      durationMs: Date.now() - start,
      relatedOfferId: opts.relatedOfferId,
      relatedWatchlistItemId: opts.relatedWatchlistItemId,
    });
    return { ok: true, data: output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logRun({
      agentId,
      triggerSource: opts.triggerSource,
      status: 'error',
      input,
      errorMessage: message,
      durationMs: Date.now() - start,
      relatedOfferId: opts.relatedOfferId,
      relatedWatchlistItemId: opts.relatedWatchlistItemId,
    });
    return { ok: false, error: message };
  }
}

export interface PipelineStep {
  agentId: string;
  /** Transformă output-ul pasului anterior (sau input-ul inițial, la primul pas)
   * în input-ul acestui agent — necesar fiindcă agenți diferiți au forme diferite. */
  mapInput?: (previousOutput: unknown, initialInput: unknown) => unknown;
}

export interface PipelineStepResult {
  agentId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface PipelineResult {
  ok: boolean;
  steps: PipelineStepResult[];
  finalOutput?: unknown;
}

/** Înlănțuie mai mulți agenți secvențial — output-ul unuia devine (prin
 * mapInput, dacă e definit) input-ul următorului. Se oprește la primul eșec,
 * păstrând rezultatele pașilor deja rulați (util pentru debugging). */
export async function runPipeline(
  steps: PipelineStep[],
  initialInput: unknown,
  opts: RunAgentOptions
): Promise<PipelineResult> {
  let currentOutput: unknown = initialInput;
  const stepResults: PipelineStepResult[] = [];

  for (const step of steps) {
    const input = step.mapInput ? step.mapInput(currentOutput, initialInput) : currentOutput;
    const result = await runAgent(step.agentId, input, opts);

    if (!result.ok) {
      stepResults.push({ agentId: step.agentId, ok: false, error: result.error });
      return { ok: false, steps: stepResults };
    }

    stepResults.push({ agentId: step.agentId, ok: true, data: result.data });
    currentOutput = result.data;
  }

  return { ok: true, steps: stepResults, finalOutput: currentOutput };
}
