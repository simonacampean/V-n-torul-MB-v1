import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createPlatform } from './actions';

export default async function AdminPlatformePage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/admin/platforme');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const { data: platforms } = await supabase
    .from('platforms')
    .select('id,name,country,grp,negotiability,connector_type,active')
    .order('country')
    .order('name');

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Platforme (AD-01)</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/cont">← Înapoi la cont</Link>
      </p>

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Platformă nouă
      </div>
      {err && <div className="agentmsg err">{err}</div>}
      <form action={createPlatform} className="card formgrid">
        <div>
          <label htmlFor="name">Nume</label>
          <input id="name" name="name" required />
        </div>
        <div>
          <label htmlFor="country">Țară (cod, ex.: DE)</label>
          <input id="country" name="country" maxLength={2} required />
        </div>
        <div>
          <label htmlFor="grp">Grup</label>
          <select id="grp" name="grp" defaultValue="major">
            <option value="major">Major</option>
            <option value="med">Mediu</option>
            <option value="collect">Colecție</option>
          </select>
        </div>
        <div>
          <label htmlFor="negotiability">Negociabilitate</label>
          <select id="negotiability" name="negotiability" defaultValue="PARTIAL">
            <option value="DA">DA</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="NU">NU</option>
            <option value="REF">REF</option>
          </select>
        </div>
        <div>
          <label htmlFor="connector_type">Tip conector</label>
          <select id="connector_type" name="connector_type" defaultValue="manual">
            <option value="manual">Manual (import asistat)</option>
            <option value="native">Nativ (anunțuri proprii)</option>
            <option value="api">API</option>
            <option value="affiliate">Afiliere</option>
          </select>
        </div>
        <div>
          <label htmlFor="legal_basis">Bază legală (obligatoriu pt. api/afiliere)</label>
          <input id="legal_basis" name="legal_basis" placeholder="ex.: acord de parteneriat semnat 2026-01" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="url_template">Șablon URL căutare ({'{query}'}, {'{yearFrom}'}, {'{yearTo}'})</label>
          <input id="url_template" name="url_template" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="note">Notă (opțional)</label>
          <input id="note" name="note" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" name="active" defaultChecked style={{ width: 'auto' }} />
          <span>Activă</span>
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary">
            Adaugă platformă
          </button>
        </div>
      </form>

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Platforme existente ({(platforms ?? []).length})
      </div>
      {(platforms ?? []).map((p) => (
        <article key={p.id} className="card flat">
          <div className="row">
            <div>
              <b>{p.name}</b>
              <div className="meta mono">
                {p.country} · {p.grp} · negociabilitate: {p.negotiability} · {p.connector_type}
              </div>
            </div>
            <span className={`status ${p.active ? 'done' : 'todo'}`}>{p.active ? 'activă' : 'inactivă'}</span>
          </div>
          <div className="btnrow">
            <Link href={`/admin/platforme/${p.id}`} className="btn">
              Editează
            </Link>
          </div>
        </article>
      ))}
    </main>
  );
}
