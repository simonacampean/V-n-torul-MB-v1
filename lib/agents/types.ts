// Interfața comună pe care orice agent AI din platformă trebuie s-o respecte
// ca să fie înregistrabil în registry.ts și rulabil prin orchestrator.ts —
// asta e contractul care face agenții interschimbabili/înlănțuibili.
export interface AgentDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  name: string;
  description: string;
  run: (input: TInput) => Promise<TOutput>;
  /** Verificare rapidă, sincronă, dacă agentul are ce-i trebuie ca să ruleze
   * (ex. o cheie API setată) — folosită de panoul admin „AI Agents", nu de
   * fluxul real de execuție (acela oricum eșuează explicit dacă lipsește ceva). */
  isConfigured?: () => boolean;
}
