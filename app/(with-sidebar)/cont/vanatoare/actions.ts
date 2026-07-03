'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const todayIso = () => new Date().toISOString().slice(0, 10);

/** F-02 — bifă de rutină zilnică per utilizator (v5: A.mark(), pe cont în loc de localStorage). */
export async function markHuntDone() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: prefs } = await supabase
    .from('user_prefs')
    .select('daily_hunt_log')
    .eq('user_id', user.id)
    .single();

  const log: string[] = Array.isArray(prefs?.daily_hunt_log) ? prefs.daily_hunt_log : [];
  const today = todayIso();
  if (!log.includes(today)) {
    const updated = [...log, today].slice(-365);
    await supabase.from('user_prefs').update({ daily_hunt_log: updated }).eq('user_id', user.id);
  }

  revalidatePath('/cont/vanatoare');
}
