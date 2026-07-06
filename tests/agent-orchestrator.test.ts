// Testează runAgent/runPipeline pe date reale din Supabase Cloud — folosește
// un agent de test (echo), înregistrat temporar în AGENT_REGISTRY, ca să nu
// depindă de ANTHROPIC_API_KEY. Necesită migrarea 0012 (tabela agent_runs)
// deja aplicată.
import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { AGENT_REGISTRY } from '../lib/agents/registry';
import { runAgent, runPipeline } from '../lib/agents/orchestrator';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && serviceKey);

describe.runIf(canRun)('runAgent / runPipeline (agent_runs live)', () => {
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });

  AGENT_REGISTRY['test-echo'] = {
    id: 'test-echo',
    name: 'Test Echo',
    description: 'Agent de test — întoarce input-ul neschimbat, fără apel de rețea.',
    run: async (input: { valoare: number }) => ({ dublu: input.valoare * 2 }),
  };
  AGENT_REGISTRY['test-fail'] = {
    id: 'test-fail',
    name: 'Test Fail',
    description: 'Agent de test — aruncă mereu o eroare.',
    run: async () => {
      throw new Error('eroare de test, intenționată');
    },
  };

  afterEach(async () => {
    await admin.from('agent_runs').delete().in('agent_id', ['test-echo', 'test-fail']);
  });

  it('runAgent rulează cu succes și loghează execuția în agent_runs', async () => {
    const result = await runAgent<{ valoare: number }, { dublu: number }>(
      'test-echo',
      { valoare: 21 },
      { triggerSource: 'manual_admin' }
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.dublu).toBe(42);

    const { data } = await admin.from('agent_runs').select('*').eq('agent_id', 'test-echo').single();
    expect(data.status).toBe('success');
    expect(data.trigger_source).toBe('manual_admin');
    expect(data.output.dublu).toBe(42);
    expect(data.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('runAgent loghează eroarea când agentul eșuează, fără să arunce excepție', async () => {
    const result = await runAgent('test-fail', {}, { triggerSource: 'manual_admin' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/eroare de test/);

    const { data } = await admin.from('agent_runs').select('*').eq('agent_id', 'test-fail').single();
    expect(data.status).toBe('error');
    expect(data.error_message).toMatch(/eroare de test/);
  });

  it('runAgent întoarce eroare pentru un agent necunoscut, fără să scrie în agent_runs', async () => {
    const result = await runAgent('agent-inexistent', {}, { triggerSource: 'manual_admin' });
    expect(result.ok).toBe(false);

    const { count } = await admin
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', 'agent-inexistent');
    expect(count).toBe(0);
  });

  it('runPipeline pasează output-ul unui agent ca input la următorul', async () => {
    const result = await runPipeline(
      [
        { agentId: 'test-echo' },
        { agentId: 'test-echo', mapInput: (prev) => ({ valoare: (prev as { dublu: number }).dublu }) },
      ],
      { valoare: 5 },
      { triggerSource: 'manual_admin' }
    );
    expect(result.ok).toBe(true);
    expect(result.finalOutput).toEqual({ dublu: 20 }); // 5 → 10 → 20
    expect(result.steps).toHaveLength(2);
  });

  it('runPipeline se oprește la primul eșec, păstrând rezultatele pașilor reușiți', async () => {
    const result = await runPipeline(
      [{ agentId: 'test-echo' }, { agentId: 'test-fail' }, { agentId: 'test-echo' }],
      { valoare: 3 },
      { triggerSource: 'manual_admin' }
    );
    expect(result.ok).toBe(false);
    expect(result.steps).toHaveLength(2); // al treilea pas nu mai rulează
    expect(result.steps[0].ok).toBe(true);
    expect(result.steps[1].ok).toBe(false);
  });
});

if (!canRun) {
  describe.skip('runAgent / runPipeline (necesită SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
