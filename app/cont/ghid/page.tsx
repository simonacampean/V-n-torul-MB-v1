import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MarkdownLite from '@/components/MarkdownLite';

export default async function GhidPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/autentificare?redirect_to=/cont/ghid');

  const { data: pages } = await supabase
    .from('content_pages')
    .select('slug,title,body')
    .eq('published', true)
    .order('slug');

  return (
    <div>
      <h1 className="page-title">Ghid & RO</h1>

      {(pages ?? []).map((p) => (
        <div key={p.slug} className="card flat">
          <div className="seclabel">▸ {p.title}</div>
          <MarkdownLite body={p.body} />
        </div>
      ))}

      <div className="note">
        Notă: benchmarkurile de preț sunt intervale orientative — verifică-le periodic pe Classic.com.
        Informațiile fiscale pot varia pe județ. Aceasta nu este consultanță financiară.
      </div>
    </div>
  );
}
