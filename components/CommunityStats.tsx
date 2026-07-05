import { createAdminClient } from '@/lib/supabase/admin';
import { fmt } from '@/lib/models';

/** Sub acest prag, o cifră mică ar submina credibilitatea, nu ar construi-o —
 * mai bine absentă decât o dovadă socială jenant de mică (P2/persuasiune etică:
 * pe date reale, nu „fake it till you make it”). */
const MIN_WATCHLIST_TO_SHOW = 10;

/** Bandă publică de social proof — cifre agregate, fără PII, din interogări
 * identice ca formă cu cele deja folosite în /admin (doar count, nicio linie
 * individuală de utilizator sau ofertă expusă). */
export default async function CommunityStats() {
  const admin = createAdminClient();
  const [{ count: watchlistCount }, { count: excellentCount }] = await Promise.all([
    admin.from('watchlist_items').select('*', { count: 'exact', head: true }),
    admin.from('offers').select('*', { count: 'exact', head: true }).eq('excellent', true).eq('status', 'active'),
  ]);

  if (!watchlistCount || watchlistCount < MIN_WATCHLIST_TO_SHOW) return null;

  return (
    <p className="meta mono" style={{ marginBottom: 14 }}>
      {fmt(watchlistCount)} mașini urmărite de comunitate
      {excellentCount ? ` · ${fmt(excellentCount)} oferte excelente active acum` : ''}
    </p>
  );
}
