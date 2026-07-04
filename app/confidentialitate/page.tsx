import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politica de confidențialitate — Vânătorul MB',
};

export default function ConfidentialitatePage() {
  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48, maxWidth: 760 }}>
      <h1 className="page-title">Politica de confidențialitate</h1>
      <p className="meta mono" style={{ marginTop: 8 }}>Ultima actualizare: 04.07.2026</p>

      <div className="ghid" style={{ marginTop: 20 }}>
        <p style={{ marginBottom: 16 }}>
          <b>1. Operatorul de date.</b> Datele tale sunt procesate de <b>HYPERSYNC SRL</b>
          (CUI RO46328902, ONRC Cluj J12/3640/2022), operatorul platformei „Vânătorul MB”. Pentru
          orice cerere legată de datele tale (acces, corectare, export, ștergere), scrie la{' '}
          <a href="mailto:alincampean@gmail.com">alincampean@gmail.com</a>.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>2. Ce date colectăm.</b> Email și parolă (hash, gestionate de Supabase Auth), factori
          2FA dacă îi activezi, preferințele de vânătoare și lista ta de urmărire, preferințele de
          alertă, datele de facturare/abonament (gestionate de Stripe — nu stocăm numărul cardului),
          și, doar cu acordul tău, cookie-uri de măsurare/publicitate.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>3. Temeiul juridic.</b> Contul și funcțiile de bază (Lista mea, alerte de produs,
          abonament) se procesează pentru <b>executarea contractului</b> dintre tine și Operator.
          Emailurile de marketing (dacă bifezi separat acest consimțământ) și cookie-urile de
          publicitate/măsurare se procesează doar cu <b>consimțământul</b> tău explicit, retractabil
          oricând.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>4. Împuterniciți (procesatori).</b> Folosim următorii furnizori pentru a opera
          platforma — fiecare procesează datele strict în numele nostru, conform contractelor lor
          de procesare:
        </p>
        <ul style={{ marginTop: -8, marginBottom: 16, paddingLeft: 20 }}>
          <li><b>Supabase</b> — bază de date, autentificare, stocare.</li>
          <li><b>Vercel</b> — găzduirea aplicației.</li>
          <li><b>Resend</b> — trimiterea emailurilor tranzacționale și de alertă.</li>
          <li><b>Stripe</b> — procesarea plăților pentru abonamentul premium.</li>
          <li><b>Google AdSense</b> — publicitate, doar după consimțământul tău la banner-ul cookie.</li>
        </ul>
        <p style={{ marginBottom: 16 }}>
          Unii dintre acești furnizori pot procesa date în afara Spațiului Economic European, pe
          baza clauzelor contractuale standard aprobate de Comisia Europeană sau a altor mecanisme
          de transfer recunoscute legal.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>5. Cookie-uri.</b> Folosim cookie-uri esențiale (sesiune, autentificare) mereu active
          și cookie-uri de măsurare/publicitate doar după ce le accepți din banner-ul afișat la
          prima vizită (Consent Mode v2) — poți schimba oricând alegerea. Detalii despre pozițiile
          publicitare, în <Link href="/termeni">Termeni și condiții</Link>.
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>6. Cât timp păstrăm datele.</b> Datele contului se păstrează cât timp contul e activ.
          După o cerere de ștergere a contului, datele personale se anonimizează în cel mult 30 de
          zile (păstrăm strict datele agregate/anonime necesare integrității istoricului de prețuri
          al platformei, fără nicio legătură cu identitatea ta).
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>7. Drepturile tale (GDPR).</b> Ai dreptul de acces, rectificare, ștergere, restricționare
          și portabilitate a datelor, precum și dreptul de a te opune prelucrării sau de a-ți retrage
          oricând consimțământul pentru marketing/cookie-uri neesențiale. Exportul complet al
          datelor contului (format JSON) și ștergerea contului sunt disponibile self-service din{' '}
          <Link href="/cont/date">Datele mele</Link>; pentru orice altă cerere, scrie la adresa de
          mai sus. Ai și dreptul de a depune plângere la Autoritatea Națională de Supraveghere a
          Prelucrării Datelor cu Caracter Personal (ANSPDCP).
        </p>

        <p style={{ marginBottom: 16 }}>
          <b>8. Securitate.</b> Accesul la datele tale e protejat prin autentificare Supabase,
          criptare în tranzit (HTTPS), izolare la nivel de rând în baza de date (fiecare utilizator
          își vede exclusiv propriile date) și autentificare în doi pași (2FA) opțională, pe care ți-o
          recomandăm să o activezi din <Link href="/cont/securitate">Securitate</Link>.
        </p>

        <p style={{ marginBottom: 0 }}>
          <b>9. Modificări.</b> Putem actualiza această politică; data ultimei actualizări e afișată
          mai sus.
        </p>
      </div>

      <div className="note" style={{ marginTop: 24 }}>
        Acest document e un șablon general, nu consultanță juridică — recomandăm o verificare de
        către un avocat/consultant specializat în protecția datelor înainte de lansarea publică.
      </div>
    </main>
  );
}
