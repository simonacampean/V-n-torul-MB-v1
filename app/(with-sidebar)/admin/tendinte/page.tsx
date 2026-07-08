import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SubmitButton from '@/components/SubmitButton';
import { createTrend } from './actions';

export default async function AdminTendintePage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/admin/tendinte');

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const [{ data: models }, { data: trends }] = await Promise.all([
    supabase.from('target_models').select('code,name').order('code'),
    supabase
      .from('model_macro_trends')
      .select('id,model_code,an_calendaristic,pret_mediu_estimat,sursa')
      .order('model_code')
      .order('an_calendaristic'),
  ]);

  const byModel = new Map<string, typeof trends>();
  for (const t of trends ?? []) {
    if (!byModel.has(t.model_code)) byModel.set(t.model_code, []);
    byModel.get(t.model_code)!.push(t);
  }

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Tendințe de piață (Grafic de Trend pe 5 Ani)</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/cont">← Înapoi la cont</Link>
      </p>
      <p style={{ marginTop: 12 }}>
        Preț mediu estimat de piață (grad de stare 3, condiție medie), per model și an calendaristic.
        Tabelul nu se populează automat — fiecare valoare are nevoie de o sursă reală, verificabilă
        (index de piață publicat, ghid de evaluare, sau media proprie din anunțuri procesate de
        platformă). Fără sursă documentată, graficul de trend rămâne ascuns pentru modelul respectiv.
      </p>

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Valoare nouă
      </div>
      {err && <div className="agentmsg err">{err}</div>}
      <form action={createTrend} className="card formgrid">
        <div>
          <label htmlFor="model_code">Model</label>
          <select id="model_code" name="model_code" required defaultValue="">
            <option value="" disabled>
              Alege modelul…
            </option>
            {(models ?? []).map((m) => (
              <option key={m.code} value={m.code}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="an_calendaristic">An calendaristic</label>
          <input id="an_calendaristic" name="an_calendaristic" type="number" min={2000} max={2100} required />
        </div>
        <div>
          <label htmlFor="pret_mediu_estimat">Preț mediu estimat (€)</label>
          <input id="pret_mediu_estimat" name="pret_mediu_estimat" type="number" min={1} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="sursa">Sursă (obligatoriu)</label>
          <input
            id="sursa"
            name="sursa"
            required
            minLength={3}
            placeholder="ex.: K500 Youngtimer Index (abonament), Hagerty Price Guide condiție #3, medie proprie offer_price_history"
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <SubmitButton pendingLabel="Se adaugă…">Adaugă valoare</SubmitButton>
        </div>
      </form>

      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Valori existente ({(trends ?? []).length})
      </div>
      {(trends ?? []).length === 0 && (
        <p className="meta mono" style={{ marginTop: 8 }}>
          Niciun punct de date încă — graficul de trend e ascuns pe tot site-ul până se adaugă cel puțin 2 ani per model.
        </p>
      )}
      {Array.from(byModel.entries()).map(([code, rows]) => (
        <article key={code} className="card flat" style={{ marginTop: 12 }}>
          <b>{code}</b>
          <table className="mono" style={{ width: '100%', marginTop: 8, fontSize: 13 }}>
            <tbody>
              {(rows ?? []).map((t) => (
                <tr key={t.id}>
                  <td>{t.an_calendaristic}</td>
                  <td>{t.pret_mediu_estimat.toLocaleString('ro-RO')} €</td>
                  <td style={{ color: 'var(--inksoft)' }}>{t.sursa}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/admin/tendinte/${t.id}`} className="btn">
                      Editează
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
    </main>
  );
}
