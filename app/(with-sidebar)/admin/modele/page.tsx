import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
      <form action={createModel} className="card formgrid">
        <div>
          <label htmlFor="code">Cod (ex.: W124)</label>
          <input id="code" name="code" required />
        </div>
        <div>
          <label htmlFor="name">Nume complet</label>
          <input id="name" name="name" required />
        </div>
        <div>
          <label htmlFor="years">Perioadă (ex.: 1984–1997)</label>
          <input id="years" name="years" required />
        </div>
        <div>
          <label htmlFor="body">Caroserie</label>
          <select id="body" name="body" defaultValue="sedan">
            <option value="sedan">Sedan</option>
            <option value="coupe">Coupé</option>
            <option value="roadster">Roadster</option>
          </select>
        </div>
        <div>
          <label htmlFor="year_from">An început</label>
          <input id="year_from" name="year_from" type="number" required />
        </div>
        <div>
          <label htmlFor="year_to">An sfârșit</label>
          <input id="year_to" name="year_to" type="number" required />
        </div>
        <div>
          <label htmlFor="band_lo">Bandă preț — minim (€)</label>
          <input id="band_lo" name="band_lo" type="number" required />
        </div>
        <div>
          <label htmlFor="band_hi">Bandă preț — maxim (€)</label>
          <input id="band_hi" name="band_hi" type="number" required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="thesis">Teza de investiție</label>
          <textarea id="thesis" name="thesis" rows={3} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="checklist">Checklist inspecție (câte un punct pe linie)</label>
          <textarea id="checklist" name="checklist" rows={4} />
        </div>
        <div>
          <label htmlFor="tags">Etichete (separate prin virgulă)</label>
          <input id="tags" name="tags" />
        </div>
        <div>
          <label htmlFor="gallery_query">Interogare galerie foto</label>
          <input id="gallery_query" name="gallery_query" required />
        </div>
        <div>
          <label htmlFor="hunt_query">Interogare căutare (F-02, ex.: „SL R129”)</label>
          <input id="hunt_query" name="hunt_query" required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="verdict">Verdict</label>
          <input id="verdict" name="verdict" required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="prod_note">Notă producție (opțional)</label>
          <input id="prod_note" name="prod_note" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" name="active" defaultChecked style={{ width: 'auto' }} />
          <span>Activ (vizibil public)</span>
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary">
            Adaugă model
          </button>
        </div>
      </form>

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
