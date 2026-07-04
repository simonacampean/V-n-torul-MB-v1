import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/(auth)/actions';
import { getTargetModels, fmt } from '@/lib/models';
import {
  scoreWatchlistItem, verdictOf, currentPrice,
  CANDIDATE_THRESHOLD,
  type WatchlistCriteria, type PriceHistoryEntry,
} from '@/lib/scoring';
import AdSlot from '@/components/AdSlot';

export default async function ContPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/autentificare?redirect_to=/cont');
  }

  // A-02 — un login cu parolă nu e suficient dacă userul are 2FA activ;
  // fără asta, vizitarea directă a /cont ar ocoli verificarea AAL2.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont');
  }

  const [{ models }, { data: items }, { data: prefs }] = await Promise.all([
    getTargetModels(),
    supabase
      .from('watchlist_items')
      .select('model_code,price,cond,criteria,price_history')
      .eq('user_id', user.id),
    supabase.from('user_prefs').select('daily_hunt_log').eq('user_id', user.id).single(),
  ]);

  const bandOf = new Map(models.map((m) => [m.code, { lo: m.band_lo, hi: m.band_hi }]));
  const watchlist = items ?? [];
  // Aceleași praguri ca în Lista mea (v5): candidat = scor pe criterii ≥ 80,
  // chilipir = verdict de preț CHILIPIR pe banda modelului ajustată la stare.
  const candidates = watchlist.filter(
    (i) => scoreWatchlistItem(i.criteria as WatchlistCriteria) >= CANDIDATE_THRESHOLD
  ).length;
  const bargains = watchlist.filter((i) => {
    const band = bandOf.get(i.model_code);
    const price = currentPrice(i.price_history as PriceHistoryEntry[], i.price);
    return band && verdictOf(band, price, i.cond)?.key === 'CHILIPIR';
  }).length;

  const log: string[] = Array.isArray(prefs?.daily_hunt_log) ? prefs.daily_hunt_log : [];
  const huntedToday = log.includes(new Date().toISOString().slice(0, 10));

  return (
    <div>
      <AdSlot position="banner" />
      <h1 className="page-title">Contul meu</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>{user.email}</p>

      {watchlist.length === 0 && (
        <div className="onb" style={{ marginTop: 16 }}>
          <b>Bine ai venit, vânătorule.</b> Traseul: ① alege modelul care-ți place din{' '}
          <Link href="/">Modele țintă</Link> (apasă „Galerie foto”) → ② deschide căutările din{' '}
          <Link href="/cont/vanatoare">Vânătoare zilnică</Link> → ③ salvează candidații în{' '}
          <Link href="/cont/lista">Lista mea</Link> — evaluatorul te anunță automat când prinzi un
          chilipir.
        </div>
      )}

      <div className="grid3" style={{ marginTop: 16 }}>
        <Link href="/cont/lista" className="statcard">
          <div className="seclabel">▸ Anunțuri urmărite</div>
          <div className="score">{fmt(watchlist.length)}</div>
          <div className="meta mono" style={{ marginTop: 4 }}>
            {fmt(candidates)} candidați (scor ≥ {CANDIDATE_THRESHOLD}) · {fmt(bargains)} chilipiruri active
          </div>
        </Link>

        <Link href="/cont/vanatoare" className="statcard">
          <div className="seclabel">▸ Vânătoarea de azi</div>
          <div className="score" style={{ color: huntedToday ? 'var(--green)' : 'var(--red)' }}>
            {huntedToday ? '✓' : '—'}
          </div>
          <div className="meta mono" style={{ marginTop: 4 }}>
            {huntedToday ? 'făcută — bravo' : 'nefăcută încă — deschide căutările'}
          </div>
        </Link>

        <Link href="/oferte" className="statcard">
          <div className="seclabel">▸ Top oferte</div>
          <div className="score">→</div>
          <div className="meta mono" style={{ marginTop: 4 }}>ierarhia calitate-preț per model</div>
        </Link>
      </div>

      <form action={signOut} style={{ marginTop: 24 }}>
        <button type="submit">Deconectează toate dispozitivele</button>
      </form>
    </div>
  );
}
