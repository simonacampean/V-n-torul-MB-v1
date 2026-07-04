import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termeni și condiții — Vânătorul MB',
};

export default function TermeniPage() {
  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48, maxWidth: 760 }}>
      <h1 className="page-title">Termeni și condiții</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>Ultima actualizare: 04.07.2026</p>

      <div className="ghid" style={{ marginTop: 20 }}>
        <p style={{ marginBottom: 16 }}>
          <b>1. Operatorul platformei.</b> „Vânătorul MB” este operat de <b>HYPERSYNC SRL</b>, cu
          sediul fiscal în Strada Grigore Alexandrescu, Municipiul Cluj-Napoca, Județul Cluj,
          CUI RO46328902, înmatriculată la ONRC Cluj sub numărul J12/3640/2022 („Operatorul”).
          Pentru întrebări legate de acești termeni, scrie la{' '}
          <a href="mailto:alincampean@gmail.com">alincampean@gmail.com</a>.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>2. Ce este platforma.</b> Vânătorul MB oferă informații orientative pentru pasionații
          de Mercedes-Benz clasice: fișe de model, agregare de anunțuri publice, un evaluator de
          preț pe grade de stare, alerte email și un modul de abonament premium. Platforma
          <b> nu vinde, nu intermediază și nu garantează</b> nicio tranzacție de vânzare-cumpărare
          între terți.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>3. Nu este consultanță financiară.</b> Benzile de preț, scorurile calitate-preț și
          orice estimare afișată sunt <b>orientative</b>, calculate pe baza unor reguli publice de
          scoring — nu reprezintă recomandări de investiție. Decizia de achiziție îți aparține în
          întregime; îți recomandăm verificare tehnică independentă (inclusiv istoric VIN) înainte
          de orice plată.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>4. Conținutul anunțurilor.</b> Pentru anunțurile agregate din surse externe, afișăm
          exclusiv date factuale (titlu, preț, an, kilometraj, link către sursă) — <b>nu preluăm
          fotografii</b> din anunțurile terților. Identitatea vizuală a platformei folosește
          ilustrații blueprint proprii. Conectoarele către surse externe funcționează doar cu bază
          legală documentată (API/parteneriat/import asistat de utilizator); până la clarificarea
          acesteia, importul rămâne asistat, nu automat.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>5. Publicitate.</b> Pozițiile publicitare pot afișa fie anunțuri Google AdSense, fie
          campanii directe ale unor parteneri. Publicitatea afișată <b>nu reprezintă o recomandare
          sau o girare</b> din partea Operatorului a produselor/serviciilor promovate.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>6. Contul tău.</b> Ești responsabil pentru păstrarea confidențialității parolei și,
          dacă e activă, a factorilor de autentificare în doi pași (2FA). Ne rezervăm dreptul de a
          suspenda conturi folosite abuziv (spam, încercări de fraudă, ocolirea moderării
          anunțurilor).
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>7. Abonamentul premium.</b> Planurile plătite se procesează prin Stripe. Abonamentul
          se reînnoiește automat la interval (lunar/anual) până la anulare; anularea se face
          oricând din portalul de gestionare a abonamentului și oprește reînnoirile viitoare, fără
          rambursarea perioadei deja plătite, cu excepția cazurilor prevăzute de lege.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>8. Limitarea răspunderii.</b> În limitele permise de lege, Operatorul nu răspunde
          pentru pagube derivate din decizii de achiziție luate pe baza informațiilor din platformă,
          din indisponibilitatea temporară a serviciului sau din conținutul unor surse externe la
          care platforma face trimitere.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>9. Legea aplicabilă.</b> Acești termeni sunt guvernați de legea română. Orice litigiu
          se soluționează pe cale amiabilă sau, în lipsa acesteia, de instanțele competente din
          România.
        </p>

        <p style={{ marginBottom: 0 }}>
          <b>10. Modificări.</b> Putem actualiza acești termeni; data ultimei actualizări e afișată
          mai sus. Continuarea folosirii platformei după o modificare înseamnă acceptarea noii
          versiuni.
        </p>
      </div>

      <div className="note" style={{ marginTop: 24 }}>
        Acest document e un șablon general, nu consultanță juridică — recomandăm o verificare de
        către un avocat/consultant specializat înainte de lansarea publică, mai ales pentru
        clauzele de răspundere și abonament.
      </div>
    </main>
  );
}
