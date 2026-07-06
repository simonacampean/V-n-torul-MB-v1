import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTargetModels } from '@/lib/models';
import PovesteaMeaForm from '@/components/PovesteaMeaForm';

const STATUS_LABEL: Record<string, string> = {
  pending: 'în așteptare — un admin o va revizui în curând',
  approved: 'aprobată — apare public pe homepage',
  rejected: 'nepublicată',
};

export default async function PovesteaMeaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/povestea-mea');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont/povestea-mea');
  }

  const [{ models }, { data: povestileMele }] = await Promise.all([
    getTargetModels(),
    supabase
      .from('success_stories')
      .select('id,model_code,moderation,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div>
      <h1 className="page-title">Povestea mea — Vânători Reușite</h1>
      <p style={{ marginTop: 12 }}>
        Ai găsit o mașină bună cu ajutorul platformei? Povestește pe scurt cum s-a întâmplat — dacă e
        aprobată, poate ajunge pe homepage, ca alți pasionați să vadă că funcționează.
      </p>

      {!!povestileMele?.length && (
        <div style={{ marginTop: 16 }} className="card flat">
          <div className="seclabel" style={{ margin: 0 }}>▸ Poveștile tale trimise</div>
          <ul className="ghid" style={{ marginTop: 8 }}>
            {povestileMele.map((p) => (
              <li key={p.id}>
                {p.model_code} — trimisă {new Date(p.created_at).toLocaleDateString('ro-RO')} —{' '}
                <b>{STATUS_LABEL[p.moderation] ?? p.moderation}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <PovesteaMeaForm models={models} />
      </div>
    </div>
  );
}
