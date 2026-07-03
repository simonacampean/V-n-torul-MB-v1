import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTargetModels } from '@/lib/models';
import { getPlatforms, groupPlatforms, buildHuntUrl, GROUP_META, NEG_LABEL } from '@/lib/hunt';
import { markHuntDone } from './actions';

const NEG_CLASS: Record<string, string> = { DA: 'da', PARTIAL: 'part', NU: 'nu', REF: 'ref' };

export default async function VanatoareZilnicaPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const { model: modelParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/vanatoare');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont/vanatoare');
  }

  const [{ models }, { platforms }, { data: prefs }] = await Promise.all([
    getTargetModels(),
    getPlatforms(),
    supabase.from('user_prefs').select('daily_hunt_log').eq('user_id', user.id).single(),
  ]);

  const activeModel = models.find((m) => m.code === modelParam) ?? models[0];
  const groups = groupPlatforms(platforms);
  const log: string[] = Array.isArray(prefs?.daily_hunt_log) ? prefs.daily_hunt_log : [];
  const huntedToday = log.includes(new Date().toISOString().slice(0, 10));

  return (
    <div>
      <h1 className="page-title">Vânătoare zilnică</h1>

      <div className="lrow">
        <span className={`status ${huntedToday ? 'done' : 'todo'}`}>
          {huntedToday ? '✓ Vânătoarea de azi: FĂCUTĂ' : '● Vânătoarea de azi: NEFĂCUTĂ'}
        </span>
        {!huntedToday && (
          <form action={markHuntDone}>
            <button type="submit" className="btn dark">
              Marchează vânătoarea de azi
            </button>
          </form>
        )}
      </div>

      <div className="modelbtns" style={{ marginTop: 20 }}>
        {models.map((m) => (
          <Link
            key={m.code}
            href={`/cont/vanatoare?model=${m.code}`}
            className={activeModel.code === m.code ? 'on' : ''}
          >
            {m.code}
          </Link>
        ))}
      </div>

      {groups.map((g) => (
        <div key={g.grp} style={{ marginBottom: 20 }}>
          <div className="seclabel">▸ {GROUP_META[g.grp].label}</div>
          {GROUP_META[g.grp].note && <div className="gnote">{GROUP_META[g.grp].note}</div>}
          <div className="grid3">
            {g.items.map((p) => {
              const url = buildHuntUrl(p, activeModel);
              return (
                <a key={p.name} className="plat" href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                  <span className="co">{p.country}</span>
                  <span className="nm">{p.name}</span>
                  <div className="nt">{p.note}</div>
                  <div className="foot">
                    <span className={`neg ${NEG_CLASS[p.negotiability]}`}>{NEG_LABEL[p.negotiability]}</span>
                    <span className="go">Deschide →</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ))}

    </div>
  );
}
