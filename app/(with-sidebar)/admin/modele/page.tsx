import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ModelForm from '@/components/ModelForm';
import { createModel } from './actions';

export default async function AdminModelePage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/admin/modele');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const { data: models } = await supabase
    .from('target_models')
    .select('code,name,years,band_lo,band_hi,body,active')
    .order('code');

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Modele țintă (AD-01)</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/cont">← Înapoi la cont</Link>
      </p>

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Model nou
      </div>
      {err && <div className="agentmsg err">{err}</div>}
      <ModelForm mode="create" action={createModel} submitLabel="Adaugă model" />

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Modele existente ({(models ?? []).length})
      </div>
      {(models ?? []).map((m) => (
        <article key={m.code} className="card flat">
          <div className="row">
            <div>
              <span className="plate sm">{m.code}</span> <b>{m.name}</b>
              <div className="meta mono">
                {m.years} · {m.body} · {m.band_lo.toLocaleString('ro-RO')}–{m.band_hi.toLocaleString('ro-RO')} €
              </div>
            </div>
            <span className={`status ${m.active ? 'done' : 'todo'}`}>{m.active ? 'activ' : 'inactiv'}</span>
          </div>
          <div className="btnrow">
            <Link href={`/admin/modele/${m.code}`} className="btn">
              Editează
            </Link>
          </div>
        </article>
      ))}
    </main>
  );
}
