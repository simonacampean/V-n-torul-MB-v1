import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fmt } from '@/lib/models';
import { calculeazaEconomie } from '@/lib/success-stories';
import ModerarePoveste from '@/components/ModerarePoveste';

export default async function AdminPovestiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/admin/povesti');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const { data: pending } = await supabase
    .from('success_stories')
    .select('id,model_code,an_fabricatie,pret_achizitie,pret_mediu_piata_atunci,nume_afisat,text_poveste,created_at')
    .eq('moderation', 'pending')
    .order('created_at', { ascending: true });

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Moderare „Vânători Reușite&rdquo;</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/cont">← Înapoi la cont</Link>
      </p>
      <p className="disclaimer mono" style={{ marginTop: 8 }}>
        Aprobă doar poveștile care par autentice și verificabile — apar direct pe homepage, public.
      </p>

      <div className="seclabel" style={{ marginTop: 20 }}>
        ▸ Povești în așteptare ({(pending ?? []).length})
      </div>
      {!pending?.length && <div className="empty">Nimic de moderat momentan.</div>}

      {(pending ?? []).map((p) => {
        const economie = calculeazaEconomie(p.pret_achizitie, p.pret_mediu_piata_atunci);
        return (
          <article key={p.id} className="card">
            <div className="row">
              <div>
                <span className="plate sm">{p.model_code}</span> <b>{p.nume_afisat || 'Un cumpărător Vânătorul MB'}</b>
                {p.an_fabricatie && <span className="meta mono"> · {p.an_fabricatie}</span>}
              </div>
            </div>
            <div className="meta mono" style={{ marginTop: 6 }}>
              preț achiziție: {fmt(p.pret_achizitie)} €
              {p.pret_mediu_piata_atunci != null && ` · preț mediu piață atunci: ${fmt(p.pret_mediu_piata_atunci)} €`}
              {economie != null && ` · economie calculată: ${fmt(economie)} €`}
              {' · trimisă '}
              {new Date(p.created_at).toLocaleDateString('ro-RO')}
            </div>
            <p style={{ fontSize: 14, marginTop: 8 }}>{p.text_poveste}</p>
            <div style={{ marginTop: 10 }}>
              <ModerarePoveste storyId={p.id} />
            </div>
          </article>
        );
      })}
    </main>
  );
}
