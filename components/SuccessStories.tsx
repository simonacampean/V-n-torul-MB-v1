import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fmt } from '@/lib/models';
import { calculeazaEconomie } from '@/lib/success-stories';

const MAX_POVESTI_AFISATE = 4;

interface SuccessStoryRow {
  id: string;
  model_code: string;
  an_fabricatie: number | null;
  pret_achizitie: number;
  pret_mediu_piata_atunci: number | null;
  nume_afisat: string | null;
  text_poveste: string;
}

/** „Vânători Reușite" — mini-studii de caz reale, trimise de utilizatori și
 * aprobate explicit de admin (vezi /admin/povesti). Complet absentă dacă nu
 * există încă nicio poveste aprobată — nu inventăm exemple placeholder ca
 * să „arate bine" (aceeași regulă ca la CommunityStats: date reale, nu
 * decorative). Economia afișată e calculată determinist din cifrele reale
 * trimise de utilizator, nu estimată de vreun agent AI. */
export default async function SuccessStories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('success_stories')
    .select('id,model_code,an_fabricatie,pret_achizitie,pret_mediu_piata_atunci,nume_afisat,text_poveste')
    .eq('moderation', 'approved')
    .order('created_at', { ascending: false })
    .limit(MAX_POVESTI_AFISATE);

  const povesti = (data ?? []) as SuccessStoryRow[];
  if (!povesti.length) return null;

  return (
    <div style={{ marginTop: 24, marginBottom: 8 }}>
      <div className="seclabel">▸ Vânători Reușite</div>
      {povesti.map((p) => {
        const economie = calculeazaEconomie(p.pret_achizitie, p.pret_mediu_piata_atunci);
        const nume = p.nume_afisat?.trim() || 'Un cumpărător Vânătorul MB';

        return (
          <article key={p.id} className="card flat" style={{ marginTop: 10 }}>
            <div className="row">
              <div>
                <span className="plate sm">{p.model_code}</span> <b>{nume}</b>
                {p.an_fabricatie && <span className="meta mono"> · {p.an_fabricatie}</span>}
              </div>
              {economie != null && (
                <div className="meta mono" style={{ color: 'var(--green)', fontWeight: 600 }}>
                  a economisit ~{fmt(economie)} €
                </div>
              )}
            </div>
            <p style={{ fontSize: 14, marginTop: 8 }}>{p.text_poveste}</p>
          </article>
        );
      })}
      <p className="disclaimer mono" style={{ marginTop: 8 }}>
        Povești reale, trimise de utilizatori și aprobate manual înainte de publicare.{' '}
        <Link href="/cont/povestea-mea">Trimite și tu povestea ta →</Link>
      </p>
    </div>
  );
}
