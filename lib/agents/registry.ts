// Registrul central al agenților AI ai platformei. Orice agent nou (viitor)
// se adaugă aici o singură dată — restul aplicației (orchestrator, panoul
// admin „AI Agents") îl descoperă automat din acest obiect, fără alte
// modificări.
import type { AgentDefinition } from './types';
import { detectivAutenticitateAgent } from './detectiv-autenticitate';

// Registrul e intenționat „type-erased" (any) — fiecare agent are propriul
// input/output distinct; siguranța de tip reală se aplică la punctul de
// apel, prin genericele explicite ale runAgent<TInput, TOutput>() din
// orchestrator.ts, nu prin tipul de stocare din acest obiect.
export const AGENT_REGISTRY: Record<string, AgentDefinition<any, any>> = {
  [detectivAutenticitateAgent.id]: detectivAutenticitateAgent,
};

export function listAgents(): AgentDefinition[] {
  return Object.values(AGENT_REGISTRY);
}
