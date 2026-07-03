# M3 — Stadiu (04.07.2026)

Preferințe utilizator (S-05), alerte email prin Resend cu șablon Datenkarte (S-02/S-03),
digest zilnic cu anti-spam (S-04), dezabonare cu un click.

## Criteriul de acceptare din caiet (secțiunea 9)
> La inserarea unei oferte cu scor ≥ pragul utilizatorului, emailul ajunge în inbox (test pe
> adresa beneficiarului) cu link funcțional către anunț; dezabonarea oprește emailurile; niciun
> utilizator nu primește mai mult de un digest/zi pe planul gratuit.

- [x] S-05: pagina `/cont/preferinte` — modele urmărite, prag alertă, buget maxim, țări preferate, comutator alerte email
- [x] S-02: două declanșatoare INDEPENDENTE (`pickAlertReason`) — scor ≥ pragul personal SAU scădere de preț ≥10%, nu doar unul condiționat de celălalt
- [x] S-03: șablon HTML Datenkarte (titlu, scor, badge-uri, preț + la cheie RO, buton, motivul alertei) + fallback text
- [x] S-04: maximum 1 digest/zi la planul gratuit (testat: a doua rulare a cron-ului nu retrimite), link de dezabonare cu un click în fiecare email
- [x] **Verificat live, în inbox real**: email trimis prin Resend, primit cu formatare corectă, buton „Deschide anunțul" funcțional
- [x] **Anti-spam confirmat live**: rulare repetată a job-ului → 0 emailuri noi pentru aceeași ofertă
- [x] **Dezabonare confirmată live**: accesarea linkului a schimbat `email_alerts` la `false` în DB

**122 teste automate trec** (26 noi față de finalul M2). Typecheck, lint, build — verzi.

## Bug real găsit prin testare live (nu doar automată)
Handler-ul `/api/cron/notifications` apela `resend.emails.send()` fără să verifice rezultatul —
SDK-ul Resend întoarce `{data, error}`, nu aruncă excepție la eșec. Primul test live a raportat
`emailsSent: 1` deși Resend respinsese efectiv trimiterea (sandbox: poate trimite doar către
adresa cu care e înregistrat contul Resend). Corectat: acum se verifică explicit `error`, se
raportează în `sendErrors`, și NU se marchează oferta ca „notificată" dacă trimiterea a eșuat —
altfel s-ar fi pierdut orice șansă de retrimitere la rularea următoare.

## Constrângere de platformă descoperită: Vercel Cron pe plan Hobby
Planul gratuit Vercel permite cron job-uri **doar o dată pe zi**. Programarea inițială (orar) a
picat la deploy. Corectat la `0 7 * * *` (o dată pe zi) — se potrivește oricum cu framing-ul S-04
de „digest zilnic" pentru planul gratuit. Scorurile tot se recalculează orar (S-01, pg_cron pe
Supabase, neafectat de limita Vercel). Pentru alerte cu adevărat instant la planul premium (M4),
va fi nevoie de upgrade la Vercel Pro.

## Verificare cu cont de test dedicat (email real al utilizatoarei din conversație)
Contul Resend nou-creat, fără domeniu verificat, poate trimite doar către adresa proprie de
înregistrare. Am creat temporar un cont de test cu acea adresă exactă, am rulat fluxul complet,
am confirmat primirea + anti-spam + dezabonare, apoi am șters contul de test și oferta de test.
Preferințele contului real (`alincampean@gmail.com`), modificate temporar pentru pregătirea
testului inițial, au fost resetate la valorile implicite la cererea beneficiarului.

## Ce rămâne pentru milestone-urile viitoare (nu blochează M3)
- Alerte instant reale la planul premium — cod pregătit (`isPremiumActive`), dar netestabil până
  există un abonament activ real (M4, Stripe) și, practic, până la un upgrade Vercel Pro pentru
  cron mai frecvent.
- Trimitere de producție către orice adresă de email — necesită verificarea unui domeniu propriu
  în Resend (`resend.com/domains`) și schimbarea adresei `from`; momentan doar sandbox.
- Web push (S-03, opțional) — neconstruit, marcat explicit opțional în caiet.
