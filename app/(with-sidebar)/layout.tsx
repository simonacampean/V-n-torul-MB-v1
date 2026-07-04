import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ContSidebar from '@/components/ContSidebar';

// SEO — implicit „noindex" pentru tot ce e cont/admin (fără valoare publică
// de căutare); /oferte, singura pagină publică din acest grup, își suprascrie
// explicit robots-ul în propriul export const metadata.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ContLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
    isAdmin = profile?.role === 'admin';
  }

  return (
    <div className="wrap cont-layout">
      <ContSidebar email={user?.email ?? null} isAdmin={isAdmin} />
      <div className="cont-content">{children}</div>
    </div>
  );
}
