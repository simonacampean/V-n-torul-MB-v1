import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DeletePlatformButton from '@/components/DeletePlatformButton';
import { updatePlatform } from '../actions';

export default async function AdminPlatformEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { err, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/autentificare?redirect_to=/admin/platforme/${id}`);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const { data: platform } = await supabase.from('platforms').select('*').eq('id', id).single();
  if (!platform) notFound();

  const updatePlatformWithId = updatePlatform.bind(null, id);

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Editează {platform.name}</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/admin/platforme">← Înapoi la platforme</Link>
      </p>

      {err && <div className="agentmsg err" style={{ marginTop: 16 }}>{err}</div>}
      {ok && <div className="agentmsg ok" style={{ marginTop: 16 }}>Salvat cu succes.</div>}

      <form action={updatePlatformWithId} className="card formgrid" style={{ marginTop: 16 }}>
        <div>
          <label htmlFor="name">Nume</label>
          <input id="name" name="name" defaultValue={platform.name} required />
        </div>
        <div>
          <label htmlFor="country">Țară (cod)</label>
          <input id="country" name="country" maxLength={2} defaultValue={platform.country} required />
        </div>
        <div>
          <label htmlFor="grp">Grup</label>
          <select id="grp" name="grp" defaultValue={platform.grp}>
            <option value="major">Major</option>
            <option value="med">Mediu</option>
            <option value="collect">Colecție</option>
          </select>
        </div>
        <div>
          <label htmlFor="negotiability">Negociabilitate</label>
          <select id="negotiability" name="negotiability" defaultValue={platform.negotiability}>
            <option value="DA">DA</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="NU">NU</option>
            <option value="REF">REF</option>
          </select>
        </div>
        <div>
          <label htmlFor="connector_type">Tip conector</label>
          <select id="connector_type" name="connector_type" defaultValue={platform.connector_type}>
            <option value="manual">Manual (import asistat)</option>
            <option value="native">Nativ (anunțuri proprii)</option>
            <option value="api">API</option>
            <option value="affiliate">Afiliere</option>
          </select>
        </div>
        <div>
          <label htmlFor="legal_basis">Bază legală (obligatoriu pt. api/afiliere)</label>
          <input id="legal_basis" name="legal_basis" defaultValue={platform.legal_basis ?? ''} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="url_template">Șablon URL căutare</label>
          <input id="url_template" name="url_template" defaultValue={platform.url_template ?? ''} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="note">Notă (opțional)</label>
          <input id="note" name="note" defaultValue={platform.note ?? ''} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" name="active" defaultChecked={platform.active} style={{ width: 'auto' }} />
          <span>Activă</span>
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn primary">
            Salvează modificările
          </button>
        </div>
      </form>

      <div style={{ marginTop: 16 }}>
        <DeletePlatformButton id={platform.id} name={platform.name} />
      </div>
    </main>
  );
}
