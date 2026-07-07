import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { condOf } from '@/lib/scoring';
import { fmt } from '@/lib/models';
import EmptyState from '@/components/EmptyState';
import ModerareOferta from '@/components/ModerareOferta';
import ModerareDraft from '@/components/ModerareDraft';
import RiscAutenticitateBadge from '@/components/RiscAutenticitateBadge';
import FiltruAntiFalsBadge from '@/components/FiltruAntiFalsBadge';
import GhidRarBadge from '@/components/GhidRarBadge';
import ArheologulOptiuniBadge from '@/components/ArheologulOptiuniBadge';
import CalculatorRestaurareBadge from '@/components/CalculatorRestaurareBadge';
import FairValueBadge from '@/components/FairValueBadge';
import RecalculeazaFairValueButton from '@/components/RecalculeazaFairValueButton';
import type { RaportAutenticitate } from '@/lib/agents/detectiv-autenticitate';
import type { FiltruAntiFalsOutput } from '@/lib/agents/filtru-anti-fals';
import type { FairValueEticheta } from '@/lib/agents/evaluator-fair-value';

export default async function AdminOfertePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/admin/oferte');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const [{ data: pending }, { data: drafts }, { data: active }] = await Promise.all([
    supabase
      .from('offers')
      .select(
        'id,model_code,title,price,year,km,cond,country,url,note,created_at,submitted_by,risc_autenticitate_scor,risc_autenticitate_detalii,autenticitate_pachet,filtru_anti_fals_detalii,eligibilitate_rar,rezumat_ro,dotari_rare_detectate,nota_raritate,bonus_dotari_rare,buget_reimprospatare_estimat,detaliere_necesitati,mesaj_atentionare'
      )
      .eq('moderation', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('agent_report_drafts')
      .select('id,generated_at,payload,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('offers')
      .select('id,model_code,title,price,cilindree_litri,fair_value_pret,fair_value_eticheta,fair_value_deviatie_procentuala,fair_value_comps_folosite')
      .eq('moderation', 'approved')
      .eq('status', 'active')
      .order('model_code', { ascending: true }),
  ]);

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Moderare anunțuri (AD-02)</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/cont">← Înapoi la cont</Link>
      </p>

      <div className="seclabel" style={{ marginTop: 20 }}>
        ▸ Rapoarte de la rutina Claude programată — de aprobat ({(drafts ?? []).length})
      </div>
      {!drafts?.length && <EmptyState>Niciun raport în așteptare.</EmptyState>}
      {(drafts ?? []).map((d) => {
        const payload = d.payload as { offers?: unknown[] };
        const count = Array.isArray(payload?.offers) ? payload.offers.length : 0;
        return (
          <article key={d.id} className="card flat">
            <div className="meta mono">
              Generat: <b style={{ color: 'var(--ink)' }}>{d.generated_at ?? '—'}</b> · {count} oferte în raport ·
              primit {new Date(d.created_at).toLocaleString('ro-RO')}
            </div>
            <div style={{ marginTop: 10 }}>
              <ModerareDraft draftId={d.id} />
            </div>
          </article>
        );
      })}

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Anunțuri în așteptare ({(pending ?? []).length})
      </div>
      <p className="disclaimer mono">
        Include atât anunțuri native trimise de utilizatori, cât și anunțuri din rutina
        programată blocate de gate-ul de auto-aprobare (risc de autenticitate ridicat, sau un
        agent de siguranță a eșuat) — verifică-le manual mai jos.
      </p>

      {!pending?.length && <EmptyState>Nimic de moderat momentan.</EmptyState>}

      {(pending ?? []).map((o) => (
        <article key={o.id} className="card">
          <div className="row">
            <div>
              <span className="plate sm">{o.model_code}</span> <b>{o.title}</b>
              {!o.submitted_by && (
                <span className="status warn" style={{ marginLeft: 8 }}>
                  blocat de gate-ul de auto-aprobare
                </span>
              )}
            </div>
          </div>
          <div className="meta mono" style={{ marginTop: 6 }}>
            {[`${fmt(o.price)} €`, o.year, o.km && `${fmt(o.km)} km`, condOf(o.cond).label.split(' — ')[0], o.country]
              .filter(Boolean)
              .join(' · ')}
          </div>
          {o.url && (
            <a href={o.url} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--red)' }}>
              anunț ↗
            </a>
          )}
          {o.note && <div style={{ fontSize: 14, color: 'var(--inksoft)', marginTop: 6 }}>{o.note}</div>}
          <RiscAutenticitateBadge
            scor={o.risc_autenticitate_scor}
            detalii={o.risc_autenticitate_detalii as RaportAutenticitate | null}
          />
          <FiltruAntiFalsBadge detalii={o.filtru_anti_fals_detalii as FiltruAntiFalsOutput | null} />
          <GhidRarBadge eligibilitate={o.eligibilitate_rar} rezumat={o.rezumat_ro} />
          <ArheologulOptiuniBadge
            dotari={o.dotari_rare_detectate}
            nota={o.nota_raritate}
            bonus={o.bonus_dotari_rare}
          />
          <CalculatorRestaurareBadge
            buget={o.buget_reimprospatare_estimat}
            detaliere={o.detaliere_necesitati}
            mesaj={o.mesaj_atentionare}
          />
          <div style={{ marginTop: 10 }}>
            <ModerareOferta offerId={o.id} />
          </div>
        </article>
      ))}

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Evaluator de Fair-Value — anunțuri active ({(active ?? []).length})
      </div>
      <p className="disclaimer mono">
        „Date insuficiente&rdquo; apare când există mai puțin de 3 anunțuri comparabile (același model,
        an/cilindree/dotări apropiate) — recalculează pe cerere pe măsură ce mai apar oferte noi.
      </p>
      {!active?.length && <EmptyState>Niciun anunț activ momentan.</EmptyState>}
      {(active ?? []).map((o) => (
        <article key={o.id} className="card flat" style={{ marginBottom: 8 }}>
          <div className="row">
            <div>
              <span className="plate sm">{o.model_code}</span> <b>{o.title}</b>
            </div>
            <div className="meta mono">{fmt(o.price)} €</div>
          </div>
          <div className="meta mono" style={{ marginTop: 6 }}>
            cilindree estimată: {o.cilindree_litri != null ? `${o.cilindree_litri}L` : '—'}
          </div>
          <div style={{ marginTop: 8 }}>
            {o.fair_value_eticheta ? (
              <FairValueBadge
                eticheta={o.fair_value_eticheta as FairValueEticheta}
                fairValuePret={o.fair_value_pret}
                deviatieProcentuala={o.fair_value_deviatie_procentuala}
                compsFolosite={o.fair_value_comps_folosite}
              />
            ) : (
              <span className="meta mono">
                date insuficiente ({o.fair_value_comps_folosite ?? 0}/3 comps)
              </span>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <RecalculeazaFairValueButton offerId={o.id} />
          </div>
        </article>
      ))}
    </main>
  );
}
