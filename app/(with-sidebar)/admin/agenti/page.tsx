import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listAgents } from '@/lib/agents/registry';
import { fmt } from '@/lib/models';
import type { TrendScoutReport } from '@/lib/agents/trend-scout';
import { PIPELINES, type Pipeline } from '@/lib/agent-heartbeat';

const PIPELINE_LABELS: Record<Pipeline, string> = {
  agent_report: 'Oferte noi (Partea A)',
  watchlist_recheck: 'Recheck Lista mea (Partea B)',
  trend_scout: 'Sentiment forumuri (Partea C)',
};

/** Praguri de alertă — cadența rutinei e la 6 ore, deci 24h fără nicio
 * rulare reușită înseamnă deja ~4 cicluri ratate (semnal de îngrijorare,
 * nu neapărat o pană); peste 72h e aproape sigur o integrare ruptă. */
const ORE_AVERTISMENT = 24;
const ORE_CRITIC = 72;

function pipelineHealth(lastRunAt: string | null): { nivel: 'ok' | 'avertisment' | 'critic'; oreDeLaUltimaRulare: number | null } {
  if (!lastRunAt) return { nivel: 'critic', oreDeLaUltimaRulare: null };
  const ore = (Date.now() - new Date(lastRunAt).getTime()) / (1000 * 60 * 60);
  if (ore >= ORE_CRITIC) return { nivel: 'critic', oreDeLaUltimaRulare: ore };
  if (ore >= ORE_AVERTISMENT) return { nivel: 'avertisment', oreDeLaUltimaRulare: ore };
  return { nivel: 'ok', oreDeLaUltimaRulare: ore };
}

interface RunRow {
  agent_id: string;
  status: 'success' | 'error';
  duration_ms: number | null;
  created_at: string;
  trigger_source: string;
  error_message: string | null;
}

const TRIGGER_LABELS: Record<string, string> = {
  import_oferte: 'Import raport/draft',
  anunt_nativ: 'Anunț nativ',
  manual_admin: 'Test manual (admin)',
  forum_ingest: 'Ingestie forumuri',
  watchlist_recheck: 'Recheck Lista mea',
};

const DIRECTION_LABELS: Record<string, string> = { crescator: 'crescător', stabil: 'stabil', scazator: 'scăzător' };
const SENTIMENT_LABELS: Record<string, string> = { pozitiv: 'pozitiv', negativ: 'negativ', mixt: 'mixt' };

/** AD-05 (nou) — panou de observabilitate pentru agenții AI ai platformei.
 * Sursa de adevăr e tabela agent_runs, scrisă exclusiv de orchestrator
 * (lib/agents/orchestrator.ts) — nimic aici nu e calculat/estimat, doar
 * agregat din execuții reale. */
export default async function AdminAgentiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/admin/agenti');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const { data: heartbeatRows } = await supabase.from('agent_heartbeats').select('pipeline,last_run_at,last_summary');
  const heartbeatByPipeline = new Map((heartbeatRows ?? []).map((h) => [h.pipeline as Pipeline, h]));

  const agents = listAgents();
  const { data } = await supabase
    .from('agent_runs')
    .select('agent_id,status,duration_ms,created_at,trigger_source,error_message')
    .order('created_at', { ascending: false })
    .limit(500);
  const runs: RunRow[] = data ?? [];
  const totalRuns = runs.length;

  interface AgentStats {
    total: number;
    success: number;
    error: number;
    totalDuration: number;
    lastRunAt: string | null;
    lastStatus: 'success' | 'error' | null;
  }
  const statsByAgent = new Map<string, AgentStats>();
  for (const r of runs) {
    const s = statsByAgent.get(r.agent_id) ?? {
      total: 0,
      success: 0,
      error: 0,
      totalDuration: 0,
      lastRunAt: null,
      lastStatus: null,
    };
    s.total++;
    if (r.status === 'success') s.success++;
    else s.error++;
    s.totalDuration += r.duration_ms ?? 0;
    if (!s.lastRunAt || r.created_at > s.lastRunAt) {
      s.lastRunAt = r.created_at;
      s.lastStatus = r.status;
    }
    statsByAgent.set(r.agent_id, s);
  }

  const recentRuns = runs.slice(0, 25);

  const { data: lastTrendRun } = await supabase
    .from('agent_runs')
    .select('output,created_at')
    .eq('agent_id', 'trend-scout')
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const trendReport = (lastTrendRun?.output as TrendScoutReport | null)?.raport ?? [];

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">AI Agents</h1>
      <p className="disclaimer mono" style={{ marginTop: 8 }}>
        Cifrele de mai jos sunt agregate direct din execuțiile reale (`agent_runs`), ultimele 500 —
        nimic estimat. Fiecare agent rulează în amonte de decizia umană (moderare, import) — nu
        publică/aprobă nimic singur.
      </p>

      <div className="seclabel" style={{ marginTop: 20 }}>
        ▸ Sănătatea rutinei programate
      </div>
      <div className="grid3" style={{ marginTop: 8 }}>
        {PIPELINES.map((pipeline) => {
          const hb = heartbeatByPipeline.get(pipeline);
          const { nivel, oreDeLaUltimaRulare } = pipelineHealth(hb?.last_run_at ?? null);
          const statusClass = nivel === 'ok' ? 'done' : nivel === 'avertisment' ? 'warn' : 'todo';
          const eticheta = nivel === 'ok' ? 'la zi' : nivel === 'avertisment' ? 'întârziat' : 'rupt/niciodată';

          return (
            <div
              className="card flat"
              key={pipeline}
              style={nivel !== 'ok' ? { borderColor: nivel === 'critic' ? 'var(--red)' : 'var(--amber)' } : undefined}
            >
              <div className="row">
                <span className="meta mono" style={{ fontWeight: 600 }}>
                  {PIPELINE_LABELS[pipeline]}
                </span>
                <span className={`status ${statusClass}`}>{eticheta}</span>
              </div>
              <div className="meta mono" style={{ marginTop: 8 }}>
                {hb?.last_run_at
                  ? `ultima rulare: ${new Date(hb.last_run_at).toLocaleString('ro-RO')} (acum ${
                      oreDeLaUltimaRulare != null && oreDeLaUltimaRulare < 1
                        ? '< 1h'
                        : `${Math.round(oreDeLaUltimaRulare ?? 0)}h`
                    })`
                  : 'nicio rulare înregistrată încă'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="seclabel" style={{ marginTop: 28 }}>
        ▸ Agenți AI
      </div>
      <div className="grid3" style={{ marginTop: 8 }}>
        {agents.map((agent) => {
          const s = statsByAgent.get(agent.id);
          const total = s?.total ?? 0;
          const successRate = total ? Math.round(((s?.success ?? 0) / total) * 100) : null;
          const sharePct = totalRuns ? Math.round((total / totalRuns) * 100) : 0;
          const avgDuration = total ? Math.round((s?.totalDuration ?? 0) / total) : null;
          const configured = agent.isConfigured ? agent.isConfigured() : true;

          return (
            <div className="card flat" key={agent.id}>
              <div className="row">
                <div className="seclabel" style={{ margin: 0 }}>
                  ▸ {agent.name}
                </div>
                <span className={`status ${configured ? 'done' : 'todo'}`}>
                  {configured ? 'configurat' : 'cheie API lipsă'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--inksoft)', marginTop: 6 }}>{agent.description}</p>

              <div className="meta mono" style={{ marginTop: 10 }}>
                {fmt(total)} execuții totale
                {successRate != null && ` · ${successRate}% succes`}
                {avgDuration != null && ` · ${fmt(avgDuration)} ms medie`}
              </div>

              <div className="lrow" style={{ marginTop: 8 }}>
                <span className="meta mono">cotă din execuții: {sharePct}%</span>
                <span className="crit-progress">
                  <span className="crit-progress-fill" style={{ width: `${sharePct}%` }} />
                </span>
              </div>

              {s?.lastRunAt && (
                <div className="meta mono" style={{ marginTop: 8 }}>
                  ultima rulare: {new Date(s.lastRunAt).toLocaleString('ro-RO')} —{' '}
                  <span style={{ color: s.lastStatus === 'success' ? 'var(--green)' : 'var(--red)' }}>
                    {s.lastStatus === 'success' ? 'reușită' : 'eșuată'}
                  </span>
                </div>
              )}
              {!s && <div className="meta mono" style={{ marginTop: 8 }}>Nicio execuție încă.</div>}
            </div>
          );
        })}
      </div>

      {lastTrendRun && (
        <>
          <div className="seclabel" style={{ marginTop: 28 }}>
            ▸ Ultimul raport Trend-Scout — {new Date(lastTrendRun.created_at).toLocaleString('ro-RO')}
          </div>
          {!trendReport.length && (
            <div className="empty">Niciun model cu mențiuni suficiente în fereastra analizată încă.</div>
          )}
          {trendReport.map((t) => (
            <article key={t.model_detectat} className="card flat" style={{ marginBottom: 8 }}>
              <div className="row">
                <div>
                  <span className="plate sm">{t.model_detectat}</span>{' '}
                  <span
                    className={`chip ${t.alerta_declansata ? 'chilipir' : ''}`}
                    style={!t.alerta_declansata ? { background: 'var(--paper)', color: 'var(--inksoft)' } : undefined}
                  >
                    {DIRECTION_LABELS[t.directie_trend] ?? t.directie_trend}
                  </span>
                </div>
                {t.alerta_declansata && <span className="status todo">alertă: +{t.variatie_procentuala}%</span>}
              </div>
              <div className="meta mono" style={{ marginTop: 6 }}>
                {t.mentiuni_luna_precedenta} → {t.mentiuni_luna_curenta} mențiuni
                {t.variatie_procentuala != null &&
                  ` (${t.variatie_procentuala > 0 ? '+' : ''}${t.variatie_procentuala}%)`}
                {' · sentiment: '}
                {SENTIMENT_LABELS[t.sentiment_net] ?? t.sentiment_net}
              </div>
              <p style={{ fontSize: 13, color: 'var(--inksoft)', marginTop: 6 }}>{t.argumente_din_discutii}</p>
            </article>
          ))}
        </>
      )}

      <div className="seclabel" style={{ marginTop: 28 }}>
        ▸ Execuții recente ({recentRuns.length})
      </div>
      {!recentRuns.length && <div className="empty">Niciun agent nu a rulat încă.</div>}
      {recentRuns.map((r, i) => (
        <article key={i} className="card flat" style={{ padding: 12, marginBottom: 8 }}>
          <div className="row">
            <div className="meta mono">
              <b style={{ color: 'var(--ink)' }}>{r.agent_id}</b> · {TRIGGER_LABELS[r.trigger_source] ?? r.trigger_source}
              {' · '}
              {new Date(r.created_at).toLocaleString('ro-RO')}
              {r.duration_ms != null && ` · ${fmt(r.duration_ms)} ms`}
            </div>
            <span className={`status ${r.status === 'success' ? 'done' : 'todo'}`}>
              {r.status === 'success' ? 'reușită' : 'eșuată'}
            </span>
          </div>
          {r.error_message && (
            <div className="meta mono" style={{ marginTop: 6, color: 'var(--red)' }}>
              {r.error_message}
            </div>
          )}
        </article>
      ))}
    </main>
  );
}
