# M5 — Stadiu (04.07.2026)

Lansare: panou admin complet (AD-01, AD-04), pagini legale, SEC-04 (jurnal de audit), GDPR-01/02
(consimțământ înregistrare, ștergere cont), SEC-01 (CSP/HSTS), SEO (metadata/sitemap/robots),
OpenGraph, Sentry, backup DB, test de încărcare de bază.

## Criteriul de acceptare din caiet (secțiunea 9)
> Checklist de lansare semnat de beneficiar pe staging, apoi go-live pe domeniul de producție.

Checklistul de mai jos e pregătit pentru semnătura beneficiarului — go-live-ul (schimbarea
domeniului de producție / promovarea finală) rămâne o decizie și acțiune a beneficiarului, nu se
execută automat de agent.

- [x] SEC-04: tabelă `audit_log` (migrarea 0009) — login, activare/dezactivare 2FA (inclusiv
  recuperare prin cod de rezervă), schimbare parolă, cerere ștergere cont, acțiuni admin. RLS:
  doar admin citește; nimeni nu scrie prin sesiunea proprie (verificat cu test care confirmă
  respingerea).
- [x] GDPR-01: consimțământ explicit ToS/Confidențialitate la înregistrare (bifă obligatorie) +
  consimțământ separat, opțional, pentru marketing (migrarea 0010, `profiles.tos_accepted_at`).
- [x] Pagini legale reale (`/termeni`, `/confidentialitate`) — identitate operator (HYPERSYNC SRL),
  procesatori GDPR-04, disclaimere L-01/L-02/L-03. Notă explicită: verificare juridică recomandată
  înainte de lansarea publică.
- [x] GDPR-02: ștergere cont self-service din „Datele mele" — reconfirmare parolă, 30 de zile de
  grație anulabile oricând, finalizare automată zilnică (`/api/cron/anonymize`): anulează
  abonamentul Stripe activ, șterge contul din Supabase Auth (cascadează prin toate tabelele).
  Migrarea 0011 a corectat și un bug real: `offers.submitted_by` nu avea `ON DELETE SET NULL` —
  ar fi blocat ștergerea oricărui cont care publicase un anunț.
- [x] SEC-01: Content-Security-Policy real (`frame-ancestors 'none'`, `object-src 'none'`,
  restricții pe scripturi/imagini/conexiuni) + HSTS (2 ani). Verificat: build de producție fără
  `unsafe-eval`; pagina, meniul și banner-ul cookie funcționează sub noul CSP.
- [x] AD-01: CRUD admin pentru modele țintă (`/admin/modele`) și platforme (`/admin/platforme`).
  Două bug-uri reale găsite prin testare live: `z.string().optional()` respinge `null` (checkbox
  nebifat trimite exact asta din FormData, nu `undefined`) și formularul de editare omitea
  `hunt_query` (coloană `NOT NULL`, folosită la F-02) — ambele corectate și verificate.
- [x] AD-04: Dashboard admin (`/admin`) — utilizatori (total/activi 30 zile/premium/admin),
  anunțuri active (+ excelente + în așteptare), alerte trimise, venit lunar estimat (MRR calculat
  live din prețurile Stripe reale). Verificat cu date reale din producție.
- [x] SEO: `noindex` explicit pe secțiunile private (cont, admin, autentificare, verificări, reset
  parolă, dezabonare); `/oferte` indexabilă cu titlu dinamic pe filtrul de model; `sitemap.xml` +
  `robots.txt` generate nativ.
- [x] OpenGraph: imagine 1200×630 generată dinamic cu blueprint-ul coupé W124 (identitate
  „Datenkarte"), nu un fișier static — verificată vizual.
- [x] Sentry: integrat complet (client/server/edge + `global-error.tsx`), no-op sigur fără DSN —
  build de producție confirmat curat. Activare: completează `NEXT_PUBLIC_SENTRY_DSN`.
- [x] Backup DB: documentat — proiectul rulează pe Supabase **Free**, fără backup automat gestionat
  (disponibil din Pro, 25$/lună, deja bugetat în caiet). Plasă de siguranță imediată construită:
  export JSON la cerere din dashboard-ul admin pentru datele de referință (modele, platforme,
  costuri transport, pagini conținut, campanii publicitare) — fără date personale.
- [x] Test de încărcare de bază: `autocannon`, build de producție local, 10 conexiuni concurente.
  `/oferte` (interogare live Supabase la fiecare cerere): 33,8 req/s, p50 281ms, p99 559ms, **0
  erori/timeout-uri din 348 cereri**. Homepage (ISR): 50,8 req/s, p50 183ms. Vezi detalii mai jos.

**151 teste automate** (15 noi față de finalul M4: audit, anonimizare cont, CRUD admin cu RLS pe
date reale, calcul MRR). Typecheck, lint, build de producție — toate verzi.

## Test de încărcare — detalii
Rulat local pe build de producție (`next start`), nu pe Vercel — suficient pentru un test de bază
conform cerinței caietului; concurență limitată intenționat (10 conexiuni) ca să nu suprasolicite
proiectul Supabase Cloud pe planul Free (rate limits mai stricte decât Pro).

| Rută | Tip | Req/s (mediu) | Latență p50 | Latență p99 | Erori |
|---|---|---|---|---|---|
| `/` | ISR (revalidate 3600s) | 50,8 | 183ms | 501ms | 0/518 |
| `/oferte` | Dinamică, query Supabase live | 33,8 | 281ms | 559ms | 0/348 |
| `/opengraph-image` | Generare imagine (edge/satori) | 5,2 | 803ms | 1619ms | 0/31 |

Concluzie: nicio eroare/timeout sub sarcină moderată; `/opengraph-image` e vizibil mai lentă (normal
pentru generare de imagine la cerere), dar e cerută rar (doar de crawlerele rețelelor sociale la
distribuire, nu de utilizatori obișnuiți) — nu afectează experiența reală.

## Bug-uri reale găsite prin testare live (nu doar automată)
1. **Checkbox opțional + zod**: `z.string().optional()` acceptă doar `undefined`, dar
   `FormData.get()` întoarce `null` pentru un checkbox nebifat — orice formular admin cu o bifă
   opțională (activ/inactiv) ar fi eșuat mereu la debifare. Corectat cu `.nullish()` în toate
   formularele afectate (modele, platforme).
2. **`hunt_query` lipsă din formularul de editare modele**: coloană `NOT NULL` folosită la
   generarea linkurilor de căutare zilnică (F-02), complet omisă din formular — ar fi blocat orice
   creare de model nou. Găsit la prima încercare reală de creare, corectat imediat.
3. **`offers.submitted_by` fără `ON DELETE SET NULL`**: ar fi blocat cu eroare de FK orice
   încercare de finalizare a ștergerii unui cont care publicase anunțuri native. Corectat prin
   migrarea 0011, verificat cu test care creează explicit acest scenariu.

## Restanțe cunoscute (nu blochează criteriul de acceptare din caiet)
- **Upgrade Supabase Free → Pro**: necesar pentru backup automat gestionat real; acțiune de
  facturare a beneficiarului, nu poate fi executată de agent.
- **Sentry DSN**: cod integrat complet, activare imediată la completarea `NEXT_PUBLIC_SENTRY_DSN`.
- **Stripe rămâne în test-mode**: trecerea la live-mode e o sarcină de lansare, nu de M5.
- **Next.js 14.2 → 16**: `npm audit` semnalează CVE-uri rezolvate în major versions mai noi
  (Next.js, eslint-config-next, vitest) — upgrade major, risc/efort semnificativ pentru a fi
  făcut reactiv; recomandat ca sarcină separată, planificată, nu în cadrul acestui milestone.
- **`transport_costs`/`reg_cost_eur`**: F-05 menționează „editabilă din admin", dar codul de
  scoring (`lib/scoring.ts`) folosește azi doar valorile seed hardcodate, niciodată citite din DB —
  am ales să nu construiesc un panou admin pentru date pe care restul aplicației nu le citește încă
  (ar fi indus o falsă senzație de control); necesită întâi conectarea `trCost`/`offerTotal` la
  tabela reală, apoi panoul admin — sarcină separată, nu în scopul explicit al AD-01.

## Checklist de lansare (pentru semnătura beneficiarului)
- [ ] Upgrade Supabase la planul Pro (backup automat + limite mai mari) — recomandat înainte de trafic real.
- [ ] Cont Sentry creat + `NEXT_PUBLIC_SENTRY_DSN` completat în Vercel (monitorizare erori activă).
- [ ] Verificare juridică a paginilor `/termeni` și `/confidentialitate` de către un avocat/consultant.
- [ ] Stripe trecut din test-mode în live-mode (chei + webhook noi în Vercel).
- [ ] Domeniu propriu conectat (dacă se dorește altul decât `vanatorul-mb.vercel.app`).
- [ ] `NEXT_PUBLIC_SITE_URL` actualizat la domeniul final de producție (afectează sitemap/OG/emailuri).
- [ ] Decizie finală: merge înainte cu Next.js 14 sau se planifică upgrade la 16 (vezi restanța de mai sus).

Odată bifate punctele de mai sus (sau asumate explicit ca amânate), platforma e pregătită tehnic
pentru go-live.
