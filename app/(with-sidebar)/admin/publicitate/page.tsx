import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PublicitateActions from '@/components/PublicitateActions';
import SubmitButton from '@/components/SubmitButton';
import { createCampaign } from './actions';

export default async function AdminPublicitatePage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/admin/publicitate');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select('id,position,mode,sponsor_name,image_url,target_url,starts_at,ends_at,impressions,clicks,active,created_at')
    .order('created_at', { ascending: false });

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Publicitate (AD-03)</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/cont">← Înapoi la cont</Link>
      </p>

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Campanie nouă
      </div>
      {err && <div className="agentmsg err">{err}</div>}
      <form action={createCampaign} className="card formgrid">
        <div>
          <label htmlFor="position">Poziție</label>
          <select id="position" name="position" defaultValue="banner">
            <option value="banner">Banner (header)</option>
            <option value="infeed">In-feed</option>
            <option value="footer">Subsol</option>
          </select>
        </div>
        <div>
          <label htmlFor="mode">Mod</label>
          <select id="mode" name="mode" defaultValue="direct">
            <option value="direct">Campanie directă</option>
            <option value="adsense">AdSense (fallback)</option>
          </select>
        </div>
        <div>
          <label htmlFor="sponsor_name">Sponsor</label>
          <input id="sponsor_name" name="sponsor_name" placeholder="ex.: Ateliere Clasic MB" />
        </div>
        <div>
          <label htmlFor="image_url">URL imagine</label>
          <input id="image_url" name="image_url" placeholder="https://..." />
        </div>
        <div>
          <label htmlFor="target_url">URL destinație</label>
          <input id="target_url" name="target_url" placeholder="https://..." />
        </div>
        <div />
        <div>
          <label htmlFor="starts_at">Start (opțional)</label>
          <input id="starts_at" name="starts_at" type="date" />
        </div>
        <div>
          <label htmlFor="ends_at">Sfârșit (opțional)</label>
          <input id="ends_at" name="ends_at" type="date" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <SubmitButton pendingLabel="Se adaugă…">Adaugă campanie</SubmitButton>
        </div>
      </form>

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Campanii ({(campaigns ?? []).length})
      </div>
      {!campaigns?.length && <div className="empty">Nicio campanie configurată — sloturile afișează fallback AdSense.</div>}
      {(campaigns ?? []).map((c) => (
        <article key={c.id} className="card flat">
          <div className="row">
            <div>
              <span className="chip">{c.position}</span> <span className="chip">{c.mode}</span>{' '}
              <b>{c.sponsor_name ?? '(fără sponsor)'}</b>
            </div>
            <span className={`status ${c.active ? 'done' : 'todo'}`}>{c.active ? 'activă' : 'inactivă'}</span>
          </div>
          <div className="meta mono" style={{ marginTop: 6 }}>
            {c.target_url && (
              <a href={c.target_url} target="_blank" rel="noopener noreferrer">
                destinație ↗
              </a>
            )}{' '}
            · afișări: {c.impressions} · clickuri: {c.clicks}
            {(c.starts_at || c.ends_at) && (
              <>
                {' '}
                · interval: {c.starts_at ? new Date(c.starts_at).toLocaleDateString('ro-RO') : '—'} →{' '}
                {c.ends_at ? new Date(c.ends_at).toLocaleDateString('ro-RO') : '—'}
              </>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <PublicitateActions campaignId={c.id} active={c.active} />
          </div>
        </article>
      ))}
    </main>
  );
}
