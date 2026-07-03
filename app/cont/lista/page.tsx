import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTargetModels } from '@/lib/models';
import ListaMea, { type WatchlistItem } from '@/components/ListaMea';

export default async function ListaMeaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/lista');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/verifica-2fa?redirect_to=/cont/lista');
  }

  const [{ models }, { data: items }] = await Promise.all([
    getTargetModels(),
    supabase
      .from('watchlist_items')
      .select('id,model_code,title,price,url,year,km,cond,note,status,criteria,price_history,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div>
      <h1 className="page-title">Lista mea</h1>
      <ListaMea models={models} items={(items as WatchlistItem[] | null) ?? []} />
    </div>
  );
}
