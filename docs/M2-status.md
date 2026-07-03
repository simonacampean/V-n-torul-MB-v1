# M2 — Stadiu (03.07.2026)

Schema `offers` + scoring S-01, import server-side (I-02) cu deduplicare (I-05), tab „Top oferte"
alimentat din DB, publicare nativă (I-03) cu moderare (AD-02, versiune minimă).

## Criteriul de acceptare din caiet (secțiunea 9)
> Importul aceluiași raport de două ori nu creează duplicate; scorurile din platformă coincid cu
> formula v5 pe un set de 20 de oferte de test; un anunț nativ trece prin moderare și apare public.

- [x] Import raport agent (I-02) — extrage blocul JSON din text liber, validează, deduplică
- [x] Deduplicare (I-05) — pe URL exact, apoi fingerprint (model+an) + km/preț ±5%
- [x] **20/20 oferte de test**: scorul calculat de funcția SQL `offer_score()` (rulată de pg_cron
      orar, S-01) coincide exact cu `offerScore()` din `lib/scoring.ts` — testat live pe Supabase Cloud
- [x] **Reimport confirmat non-duplicat**: `planOfferImport()` (funcție pură, testabilă) + test live
      RLS pentru fluxul complet
- [x] Anunț nativ (I-03): userul publică direct (RLS forțează `moderation='pending'`, nu se poate
      auto-aproba), invizibil public până la aprobare, admin aprobă → devine vizibil public — testat
      live, inclusiv că un user obișnuit NU poate aproba anunțul altcuiva
- [x] Pagina publică `/oferte` — Top 10 per model, filtrabil, câmpul `excellent` vizibil doar
      autentificat (scorul numeric rămâne vizibil pentru toți)
- [x] Pagină minimă de moderare `/admin/oferte` (doar cât cere criteriul M2 — panoul complet e M5)

**92 teste automate trec** (42 noi față de finalul M1). Typecheck, lint, build — verzi.

## Descoperire neașteptată, investigată înainte de a continua
Tabela `offers` avea deja 3 politici RLS live pe Supabase Cloud, necreate de nicio migrare locală
(0001-0004) — origine neclarificată nici de beneficiar. Tabela era goală (0 rânduri, fără risc de
date). Politicile erau de fapt bine gândite (user se auto-publică cu `moderation='pending'` impus,
fără să aibă nevoie de bypass admin) — le-am adoptat ca sursă de adevăr într-o migrare idempotentă
(`drop policy if exists` + `create policy`), în loc să le suprascriu orbește.

## Un bug de test real găsit și corectat
Primul test scris pentru "un user obișnuit nu poate aproba anunțul altcuiva" aștepta o eroare de la
Postgres — greșit: RLS filtrează silențios rândurile neautorizate (0 rânduri afectate, fără eroare),
nu aruncă o excepție de permisiune. Corectat să verifice efectul real (moderation neschimbat), nu
prezența unei erori.

## Notă de proces
Contul beneficiarului (`alincampean@gmail.com`) a primit rolul `admin` (necesar pentru testarea
moderării anunțurilor native, criteriu explicit de acceptare M2).

## Ce rămâne pentru milestone-urile viitoare (nu blochează M2)
- „+ În lista mea" (adăugare rapidă din Top oferte în Lista mea) — omis deliberat, nu era cerut de
  criteriul de acceptare M2; poate reveni ca rafinament.
- Panoul admin complet (AD-01, AD-03, AD-04) — M5.
- Marcarea `expired` a ofertelor dispărute din sursă — nu era testabil fără un flux real repetat de
  re-verificare; de revizitat când I-01 (conectoare API) prinde contur.

## Adăugare peste scopul inițial M2: rutină de cercetare programată + drafturi
Beneficiarul a cerut import „automat, 24/24, fără intervenție umană" al raportului agentului (I-02).
Am clarificat: automatizare completă (scraping sistematic al mobile.de/AutoScout24/etc.) ar încălca
I-04 din caiet și ToS-ul acelor platforme — risc real de penalizări. Soluție adoptată, cu acordul
beneficiarului:
- **Migrare `0006_agent_report_drafts.sql`** — tabelă nouă, RLS admin-only.
- **`POST /api/agent-report`** — endpoint protejat prin token bearer (`AGENT_REPORT_TOKEN`), primește
  raportul generat de o rutină Claude programată și îl stochează ca „draft" — **nu importă automat**.
- **Rutină Claude programată** (`vanatorul-mb-agent-research`, la fiecare 6 ore) — face cercetare web
  generală (nu scraping sistematic al platformelor țintă), compilează raportul și îl trimite la endpoint.
  Notă pentru beneficiar: rulează doar cât timp aplicația Claude e deschisă pe mașina lui; dacă e
  închisă la momentul programat, task-ul rulează la următoarea deschidere — nu e infrastructură
  cloud complet independentă.
- Aprobarea rămâne manuală, din `/admin/oferte` (om în buclă la decizia finală, chiar dacă cercetarea
  e automatizată).

## Deploy — infrastructură rezolvată în această sesiune
Proiectul nu era deloc un repo git și nu avea niciun commit. Am inițializat git, am creat primul
commit (M0+M1+M2) și l-am publicat pe `https://github.com/simonacampean/V-n-torul-MB-v1`. Conectarea
GitHub↔Vercel prin dashboard a întâmpinat obstacole (permisiuni GitHub App) — am publicat direct prin
`vercel --prod` (autentificat prin `npx vercel login`), proiectul e live pe
**https://vanatorul-mb.vercel.app** cu tot codul din M1+M2. Am găsit și reparat o variabilă de mediu
greșit setată pe Vercel (`NEXT_PUBLIC_SITE_URL` era goală, ar fi stricat redirect-ul de confirmare
email în producție).

**De rezolvat separat (nu blochează M2):** conectarea GitHub→Vercel pentru deploy automat la fiecare
push rămâne neterminată (permisiunea GitHub App pentru acest repo specific) — deploy-urile viitoare
necesită `vercel --prod` manual până se rezolvă.
