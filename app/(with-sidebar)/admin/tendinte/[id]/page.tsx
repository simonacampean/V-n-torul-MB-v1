import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DeleteTrendButton from '@/components/DeleteTrendButton';
import SubmitButton from '@/components/SubmitButton';
import { updateTrend } from '../actions';

export default async function AdminTrendEditPage({
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
  if (!user) redirect(`/autentificare?redirect_to=/admin/tendinte/${id}`);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const [{ data: trend }, { data: models }] = await Promise.all([
    supabase.from('model_macro_trends').select('*').eq('id', id).single(),
    supabase.from('target_models').select('code,name').order('code'),
  ]);
  if (!trend) notFound();

  const updateTrendWithId = updateTrend.bind(null, id);

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">
        Editează {trend.model_code} — {trend.an_calendaristic}
      </h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/admin/tendinte">← Înapoi la tendințe</Link>
      </p>

      {err && (
        <div className="agentmsg err" style={{ marginTop: 16 }}>
          {err}
        </div>
      )}
      {ok && (
        <div className="agentmsg ok" style={{ marginTop: 16 }}>
          Salvat cu succes.
        </div>
      )}

      <form action={updateTrendWithId} className="card formgrid" style={{ marginTop: 16 }}>
        <div>
          <label htmlFor="model_code">Model</label>
          <select id="model_code" name="model_code" defaultValue={trend.model_code} required>
            {(models ?? []).map((m) => (
              <option key={m.code} value={m.code}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="an_calendaristic">An calendaristic</label>
          <input
            id="an_calendaristic"
            name="an_calendaristic"
            type="number"
            min={2000}
            max={2100}
            defaultValue={trend.an_calendaristic}
            required
          />
        </div>
        <div>
          <label htmlFor="pret_mediu_estimat">Preț mediu estimat (€)</label>
          <input
            id="pret_mediu_estimat"
            name="pret_mediu_estimat"
            type="number"
            min={1}
            defaultValue={trend.pret_mediu_estimat}
            required
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="sursa">Sursă (obligatoriu)</label>
          <input id="sursa" name="sursa" required minLength={3} defaultValue={trend.sursa ?? ''} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <SubmitButton pendingLabel="Se salvează…">Salvează modificările</SubmitButton>
        </div>
      </form>

      <div style={{ marginTop: 16 }}>
        <DeleteTrendButton id={trend.id} label={`${trend.model_code} — ${trend.an_calendaristic}`} />
      </div>
    </main>
  );
}
