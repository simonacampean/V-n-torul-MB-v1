import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { condOf } from '@/lib/scoring';
import { fmt } from '@/lib/models';
import ModerareOferta from '@/components/ModerareOferta';
import ModerareDraft from '@/components/ModerareDraft';
import RiscAutenticitateBadge from '@/components/RiscAutenticitateBadge';
import FiltruAntiFalsBadge from '@/components/FiltruAntiFalsBadge';
import GhidRarBadge from '@/components/GhidRarBadge';
import type { RaportAutenticitate } from '@/lib/agents/detectiv-autenticitate';
import type { FiltruAntiFalsOutput } from '@/lib/agents/filtru-anti-fals';

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

  const [{ data: pending }, { data: drafts }] = await Promise.all([
    supabase
      .from('offers')
      .select(
        'id,model_code,title,price,year,km,cond,country,url,note,created_at,risc_autenticitate_scor,risc_autenticitate_detalii,autenticitate_pachet,filtru_anti_fals_detalii,eligibilitate_rar,rezumat_ro'
      )
      .eq('moderation', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('agent_report_drafts')
      .select('id,generated_at,payload,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
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
      {!drafts?.length && <div className="empty">Niciun raport în așteptare.</div>}
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
        ▸ Anunțuri native în așteptare ({(pending ?? []).length})
      </div>

      {!pending?.length && <div className="empty">Nimic de moderat momentan.</div>}

      {(pending ?? []).map((o) => (
        <article key={o.id} className="card">
          <div className="row">
            <div>
              <span className="plate sm">{o.model_code}</span> <b>{o.title}</b>
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
          <div style={{ marginTop: 10 }}>
            <ModerareOferta offerId={o.id} />
          </div>
        </article>
      ))}
    </main>
  );
}
