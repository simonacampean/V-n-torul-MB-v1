import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DeleteModelButton from '@/components/DeleteModelButton';
import { updateModel } from '../actions';

export default async function AdminModelEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { code } = await params;
  const { err, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/autentificare?redirect_to=/admin/modele/${code}`);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const { data: model } = await supabase.from('target_models').select('*').eq('code', code).single();
  if (!model) notFound();

  const updateModelWithCode = updateModel.bind(null, code);

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Editează {model.code}</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/admin/modele">← Înapoi la modele</Link>
      </p>

      {err && <div className="agentmsg err" style={{ marginTop: 16 }}>{err}</div>}
      {ok && <div className="agentmsg ok" style={{ marginTop: 16 }}>Salvat cu succes.</div>}

      <form action={updateModelWithCode} className="card formgrid" style={{ marginTop: 16 }}>
        <div>
          <label htmlFor="name">Nume complet</label>
          <input id="name" name="name" defaultValue={model.name} required />
        </div>
        <div>
          <label htmlFor="years">Perioadă</label>
          <input id="years" name="years" defaultValue={model.years} required />
        </div>
        <div>
          <label htmlFor="body">Caroserie</label>
          <select id="body" name="body" defaultValue={model.body}>
            <option value="sedan">Sedan</option>
            <option value="coupe">Coupé</option>
            <option value="roadster">Roadster</option>
          </select>
        </div>
        <div>
          <label htmlFor="year_from">An început</label>
          <input id="year_from" name="year_from" type="number" defaultValue={model.year_from} required />
        </div>
        <div>
          <label htmlFor="year_to">An sfârșit</label>
          <input id="year_to" name="year_to" type="number" defaultValue={model.year_to} required />
        </div>
        <div>
          <label htmlFor="band_lo">Bandă preț — minim (€)</label>
          <input id="band_lo" name="band_lo" type="number" defaultValue={model.band_lo} required />
        </div>
        <div>
          <label htmlFor="band_hi">Bandă preț — maxim (€)</label>
          <input id="band_hi" name="band_hi" type="number" defaultValue={model.band_hi} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="thesis">Teza de investiție</label>
          <textarea id="thesis" name="thesis" rows={3} defaultValue={model.thesis} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="checklist">Checklist inspecție (câte un punct pe linie)</label>
          <textarea id="checklist" name="checklist" rows={4} defaultValue={(model.checklist ?? []).join('\n')} />
        </div>
        <div>
          <label htmlFor="tags">Etichete (separate prin virgulă)</label>
          <input id="tags" name="tags" defaultValue={(model.tags ?? []).join(', ')} />
        </div>
        <div>
          <label htmlFor="gallery_query">Interogare galerie foto</label>
          <input id="gallery_query" name="gallery_query" defaultValue={model.gallery_query} required />
        </div>
        <div>
          <label htmlFor="hunt_query">Interogare căutare (F-02)</label>
          <input id="hunt_query" name="hunt_query" defaultValue={model.hunt_query} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="verdict">Verdict</label>
          <input id="verdict" name="verdict" defaultValue={model.verdict} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="prod_note">Notă producție (opțional)</label>
          <input id="prod_note" name="prod_note" defaultValue={model.prod_note ?? ''} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" name="active" defaultChecked={model.active} style={{ width: 'auto' }} />
          <span>Activ (vizibil public)</span>
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary">
            Salvează modificările
          </button>
        </div>
      </form>

      <div style={{ marginTop: 16 }}>
        <DeleteModelButton code={model.code} />
      </div>
    </main>
  );
}
