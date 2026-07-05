import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DeleteModelButton from '@/components/DeleteModelButton';
import ModelForm from '@/components/ModelForm';
import { updateModel } from '../actions';

export default async function AdminModelEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { code } = await params;
  const { err, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/autentificare?redirect_to=/admin/modele/${code}`);

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <main className="wrap" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="page-title">Acces restricționat</h1>
        <p style={{ marginTop: 12 }}>Această pagină e disponibilă doar administratorilor.</p>
      </main>
    );
  }

  const { data: model } = await supabase.from('target_models').select('*').eq('code', code).single();
  if (!model) notFound();

  const updateModelWithCode = updateModel.bind(null, code);

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1 className="page-title">Editează {model.code}</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>
        <Link href="/admin/modele">← Înapoi la modele</Link>
      </p>

      {err && <div className="agentmsg err" style={{ marginTop: 16 }}>{err}</div>}
      {ok && <div className="agentmsg ok" style={{ marginTop: 16 }}>Salvat cu succes.</div>}

      <ModelForm
        mode="edit"
        action={updateModelWithCode}
        submitLabel="Salvează modificările"
        initial={{
          name: model.name,
          years: model.years,
          body: model.body,
          year_from: model.year_from,
          year_to: model.year_to,
          band_lo: model.band_lo,
          band_hi: model.band_hi,
          thesis: model.thesis,
          checklist: (model.checklist ?? []).join('\n'),
          tags: (model.tags ?? []).join(', '),
          verdict: model.verdict,
          gallery_query: model.gallery_query,
          hunt_query: model.hunt_query,
          prod_note: model.prod_note ?? '',
          active: model.active,
        }}
      />

      <div style={{ marginTop: 16 }}>
        <DeleteModelButton code={model.code} />
      </div>
    </main>
  );
}
