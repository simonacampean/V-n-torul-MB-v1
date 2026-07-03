# CAIET DE SARCINI — PLATFORMA „VÂNĂTORUL MB" v2.0 (SaaS)

Versiune document: 1.0 · Data: 02.07.2026 · Beneficiar: Alin Câmpean · Limba produsului: română (arhitectură pregătită pentru i18n)

Acest document este specificația completă pentru transformarea aplicației locale „Vânătorul MB" (fișierul `vanatorul-mercedes.html`, versiunea v5, livrat împreună cu acest caiet) într-o platformă web comercială multi-utilizator. Documentul este scris pentru a fi folosit direct ca brief de dezvoltare în Claude Code. Fișierul v5 este sursa de adevăr pentru design, texte, logica de scoring și structura de date existentă — se portează, nu se reinventează.

---

## 1. Prezentare generală și obiective

### 1.1 Ce este produsul
Platformă online pentru pasionații de mașini clasice din România și Europa de Est, concentrată inițial pe Mercedes-Benz youngtimer/clasic sub 20.000 €. Ajută utilizatorii să descopere modele cu potențial de investiție, să urmărească anunțuri de pe piețele europene, să evalueze prețuri pe grade de stare, să primească alerte de oferte excelente pe email și să gestioneze procesul de achiziție și înmatriculare în România.

### 1.2 Obiective de business
Platforma trebuie să fie profitabilă prin trei fluxuri de venit: publicitate (Google AdSense plus spații vândute direct către parteneri: magazine de piese, ateliere de restaurare, firme de import și transport, asigurători de colecție), linkuri de afiliere (carVertical/autoDNA pentru rapoarte VIN, platforme partenere) și un abonament premium (alerte email nelimitate, agent zilnic personalizat, istoric de prețuri extins).

### 1.3 Diferențiatorul
Singura platformă în limba română orientată pe cumpărătorul din Europa de Est: cost total „la cheie" în România (transport pe țară de proveniență + înmatriculare + service de intrare), ghid RAR/DRPCIV/vehicul istoric, evaluare pe grade de stare adaptată pieței europene.

### 1.4 Ce NU face produsul (out of scope v2.0)
Nu vinde mașini, nu procesează plăți între cumpărători și vânzători, nu oferă consultanță financiară (disclaimer obligatoriu), nu face scraping împotriva termenilor de utilizare ai platformelor sursă (vezi secțiunea 8).

---

## 2. Arhitectură tehnică

### 2.1 Stack recomandat
- Frontend: Next.js 14+ (App Router), React, TypeScript. Stilizare cu CSS custom portat din v5 (design system „Datenkarte" — variabilele CSS, fonturile Archivo + IBM Plex Mono și componentele vizuale existente se păstrează identic). PWA completă (manifest, service worker, instalabilă pe iOS/Android).
- Backend & bază de date: Supabase (PostgreSQL, Auth cu MFA TOTP, Row Level Security, Edge Functions, pg_cron pentru joburi programate).
- Email tranzacțional: Resend (alternativ SendGrid). Domeniu propriu cu SPF/DKIM/DMARC configurate.
- Plăți abonamente: Stripe (Checkout + Customer Portal), planuri lunar/anual.
- Hosting: Vercel (frontend + API routes), Supabase cloud (backend). CI/CD prin GitHub Actions.
- Analiza AI a anunțurilor (opțional, faza M3): Anthropic API pentru normalizarea și scorarea descrierilor de anunțuri importate.

### 2.2 Diagrama logică
Client (Next.js PWA) → API routes / Supabase client → PostgreSQL (RLS per utilizator) → joburi programate (ingestie surse legale + calcul scoruri + generare alerte) → Resend (email) / Web Push (notificări browser).

### 2.3 Medii
Trei medii: local (docker supabase), staging, producție. Secretele exclusiv în variabile de mediu (niciodată în repo): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ANTHROPIC_API_KEY.

---

## 3. Funcționalități de portat din v5 (existente, obligatoriu identice funcțional)

- F-01. Modele țintă: cele 6 fișe (W124/C124, R129, W201, W126, W123, W140) cu teze de investiție, benzi de preț, ilustrații blueprint SVG originale, checklist de inspecție, link galerie foto. Conținutul devine editabil din admin (secțiunea 6).
- F-02. Vânătoare zilnică: cele 3 grupe de platforme (majore, Mediterana, colecționari) cu linkuri pre-configurate per model, badge-uri de negociabilitate, bifă de rutină zilnică per utilizator.
- F-03. Lista mea: CRUD anunțuri urmărite, scoring pe 6 criterii ponderate (istoric service 25, originalitate 25, stare tehnică 20, km 10, proprietari 10, specificație 10), statusuri pipeline, istoric de preț per anunț, contor zile pe piață cu semnal de negociere la 30+, comparator side-by-side (max 3), căutare/filtrare/sortare.
- F-04. Evaluator de preț: benzi per model ajustate cu gradele de stare #1 (×1,30), #2 (×1,00), #3 (×0,70), #4 (×0,45); verdicte CHILIPIR (sub 85% din pragul inferior) / SUB PIAȚĂ / LA PIAȚĂ / PESTE PIAȚĂ; pop-up de alertă la chilipir.
- F-05. Top oferte (Agent): scor calitate-preț 0–100 (preț vs stare 40p, dotări 15p, istoric verificat 15p, negociabilitate 8p, cost aducere pe țară 12p, km optim 10p), prag de excelență 85, ierarhie top 10 per model, badge-uri FULL OPTIONS / ISTORIC VERIFICAT, cost „la cheie" în RO, acces rapid la anunț, transfer în Lista mea. Harta costurilor de transport pe țări din v5 se păstrează și devine editabilă din admin.
- F-06. Ghid & RO: conținutul complet (achiziție, înmatriculare, strategie de deținere, instalare PWA), gestionabil din admin ca pagini de conținut.
- F-07. Export/import backup JSON al datelor proprii (rămâne, ca portabilitate GDPR).
- F-08. Zonele publicitare: pozițiile banner header, in-feed, subsol din v5, gestionate prin modulul de monetizare (secțiunea 5.4).

Datele existente ale utilizatorului din v5 (localStorage) trebuie să poată fi importate în cont la prima autentificare prin fluxul de import backup existent.

---

## 4. Funcționalități noi

### 4.1 Conturi și autentificare (cerința prioritară a beneficiarului)
- A-01. Înregistrare cu email + parolă (Supabase Auth), verificare email obligatorie. Opțional login social Google.
- A-02. Autentificare în doi pași TOTP compatibilă cu orice aplicație de tip authenticator (Google Authenticator, Duo Mobile, Authy): înrolare cu cod QR, verificare la login, 10 coduri de rezervă generate la activare, posibilitate de dezactivare doar cu confirmare prin cod valid. Implementare prin Supabase MFA; nu se implementează criptografie proprie.
- A-03. Politică de parole: minim 10 caractere, verificare împotriva listelor de parole compromise (haveibeenpwned k-anonymity), rate limiting la login (max 5 încercări / 15 min / IP+cont).
- A-04. Sesiuni: JWT gestionate de Supabase, refresh automat, logout global („deconectează toate dispozitivele").
- A-05. Recuperare cont: reset parolă prin email; dacă 2FA e activ, resetul de parolă NU dezactivează 2FA.
- A-06. Roluri: `user`, `premium`, `admin`. Toate tabelele cu date de utilizator protejate prin Row Level Security (un utilizator își vede exclusiv propriile date).

### 4.2 Agregarea anunțurilor (motorul platformei)
Principiu obligatoriu: doar surse legale. Pentru fiecare sursă se implementează un „conector" cu una dintre strategiile:
- I-01. API oficial / feed de parteneriat sau afiliere, acolo unde platforma sursă îl oferă (de verificat la momentul implementării: programe de parteneriat AutoScout24, eBay Browse API pentru Kleinanzeigen unde e permis, feed-uri Catawiki/Car & Classic pentru parteneri). Fiecare conector documentează în cod baza legală a accesului.
- I-02. Import asistat: utilizatorul (sau agentul Claude al utilizatorului) lipește raportul JSON — fluxul existent din v5, păstrat ca mecanism universal care nu depinde de terți.
- I-03. Anunțuri publicate direct pe platformă: vânzătorii pot lista gratuit mașini clasice (formular cu aceleași câmpuri ca schema `offers`), cu moderare din admin. Acesta devine pe termen lung conținutul propriu al platformei.
- I-04. Interzis explicit: crawling/scraping al site-urilor care îl interzic în ToS, ocolirea măsurilor anti-bot, republicarea fotografiilor din anunțuri fără drept (se stochează doar linkul către anunțul sursă, titlul, prețul și metadatele factuale).
- I-05. Deduplicare pe URL canonic + fingerprint (model, an, km±5%, preț±5%). Anunțurile dispărute din sursă se marchează `expired` la re-verificare, nu se șterg (istoricul de preț rămâne).

### 4.3 Scoring și alerte
- S-01. Job programat (pg_cron, o dată pe oră) recalculează scorul calitate-preț pentru anunțurile active, folosind formula din F-05 și benzile de preț curente.
- S-02. Alertă „ofertă excelentă": la trecerea unui anunț peste pragul 85 (sau la scădere de preț ≥10%), se generează notificare pentru toți utilizatorii care urmăresc modelul respectiv și au alerta activă.
- S-03. Canale de notificare: email (obligatoriu, prin Resend, cu șablon HTML în stilul Datenkarte: titlu anunț, scor, badge-uri, preț + la cheie în RO, buton „Deschide anunțul", motivul alertei) și web push opțional. Emailul beneficiarului (alincampean@gmail.com) se configurează ca orice cont de utilizator — nu se hardcodează în aplicație.
- S-04. Anti-spam: maximum 1 email de digest pe zi per utilizator la planul gratuit (alertele se grupează), alerte instant individuale la planul premium; link de dezabonare cu un click în fiecare email (cerință legală).
- S-05. Preferințe per utilizator: modele urmărite, prag de scor pentru alertă, buget maxim, țări preferate.

### 4.4 Administrare (panou admin, rol `admin`)
- AD-01. CRUD modele țintă (benzi de preț, teze, checklist-uri) și grupuri de platforme.
- AD-02. Moderarea anunțurilor publicate direct și a rapoartelor importate.
- AD-03. Gestiunea spațiilor publicitare: per poziție se alege modul AdSense (snippet global) sau campanie directă (imagine încărcată de admin + link + interval de afișare + contor de afișări/clickuri pentru raportare către sponsor).
- AD-04. Dashboard: utilizatori activi, anunțuri active, alerte trimise, venit estimat.

---

## 5. Model de date (PostgreSQL, schema minimă)

Toate tabelele au `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at`. RLS activ pe toate tabelele cu `user_id`.

- `profiles` — user_id (fk auth.users), display_name, role (user/premium/admin), country, marketing_consent bool, created din trigger la signup.
- `target_models` — code (W124...), name, years, year_from, year_to, band_lo, band_hi, body, thesis, checklist jsonb, tags jsonb, verdict, gallery_query, active bool.
- `platforms` — name, country, group (major/med/collect), negotiability (DA/PARTIAL/NU/REF), note, url_template, connector_type (api/affiliate/manual/native), legal_basis text.
- `offers` — anunțurile agregate: model_code fk, title, price int, currency, year, km, country, url unique, cond (1–4), options (full/partial/standard), history_verified bool, negotiability, note, source_platform fk, status (active/expired/sold), score int, excellent bool, first_seen, last_seen, fingerprint.
- `offer_price_history` — offer_id fk, price, seen_at.
- `watchlist_items` — Lista mea per utilizator: user_id, model_code, title, price, url, year, km, cond, note, status (pipeline), criteria jsonb (cele 6 bife), price_history jsonb, source_offer_id nullable.
- `user_prefs` — user_id, followed_models text[], alert_threshold int default 85, max_budget int, preferred_countries text[], email_alerts bool, push_alerts bool, daily_hunt_log jsonb.
- `notifications` — user_id, offer_id, type (excellent/price_drop/digest), channel (email/push), sent_at, opened_at nullable.
- `transport_costs` — country_code pk, cost_eur int (valorile din v5 ca seed), plus `reg_cost_eur` ca setare globală (seed 900).
- `subscriptions` — user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end.
- `ad_campaigns` — position (banner/infeed/footer), mode (adsense/direct), image_url, target_url, starts_at, ends_at, impressions int, clicks int, sponsor_name.
- `content_pages` — slug (ghid-achizitie, ghid-ro...), title, body markdown, published bool.

Seed obligatoriu: cele 6 modele, cele 16 platforme și costurile de transport, cu valorile exacte din fișierul v5.

---

## 6. API (Next.js route handlers / Supabase)

Prefix `/api/v1`. Autentificare prin token Supabase; rate limiting global 100 req/min/utilizator.

- `GET /models` · `GET /models/:code` — publice.
- `GET /offers?model=&min_score=&country=&max_price=&sort=` — publice (paginat, max 50/pagină); câmpul `excellent` vizibil doar autentificat (motiv de conversie la cont).
- `POST /offers/import` — autentificat: primește JSON-ul agentului (formatul exact din v5: generated, offers[]), validează, deduplică, inserează.
- `POST /offers` — autentificat: publicare anunț propriu (intră în moderare).
- `GET|POST|PATCH|DELETE /watchlist` — autentificat, RLS.
- `GET|PATCH /prefs` — autentificat.
- `POST /auth/mfa/enroll` · `POST /auth/mfa/verify` · `POST /auth/mfa/unenroll` — fluxul TOTP (wrapper peste Supabase MFA).
- `POST /billing/checkout` · `POST /billing/portal` · `POST /webhooks/stripe` — abonamente.
- `GET /admin/*` — doar rol admin.

---

## 7. Securitate și GDPR (piață UE/România — obligatoriu)

- SEC-01. HTTPS exclusiv, HSTS, security headers (CSP, X-Frame-Options DENY, Referrer-Policy), cookie-uri Secure/HttpOnly/SameSite.
- SEC-02. Validare server-side pe toate inputurile (zod), sanitizare la afișare (protecție XSS — atenție la titlurile/notele anunțurilor importate), interogări exclusiv parametrizate.
- SEC-03. RLS testat: un test automat demonstrează că userul A nu poate citi/modifica datele userului B.
- SEC-04. Loguri de audit pentru: login, activare/dezactivare 2FA, schimbare parolă, ștergere cont, acțiuni admin.
- GDPR-01. Consimțământ explicit la înregistrare (ToS + politică de confidențialitate, documente redactate separat), consimțământ separat pentru emailuri de marketing (alertele de produs sunt legitime prin contract).
- GDPR-02. Dreptul la portabilitate: export complet al datelor contului (JSON) din setări. Dreptul la ștergere: ștergere cont self-service cu anonimizarea datelor în 30 de zile.
- GDPR-03. Banner de consimțământ cookie conform (AdSense în UE necesită CMP certificat Google, ex. mod „Consent Mode v2"); fără cookie-uri de tracking înainte de consimțământ.
- GDPR-04. Procesatori documentați în politica de confidențialitate: Supabase, Vercel, Resend, Stripe, Google AdSense.

---

## 8. Cadrul legal al conținutului

- L-01. Nu se preiau fotografii din anunțurile terților; se afișează exclusiv date factuale (preț, an, km, titlu scurt) + link către sursă. Ilustrațiile blueprint proprii din v5 rămân identitatea vizuală.
- L-02. Fiecare conector de sursă se activează doar cu bază legală documentată (API/parteneriat/permisiune scrisă). Conectoarele fără bază legală rămân în modul „import asistat" (I-02).
- L-03. Disclaimere afișate permanent: platforma nu oferă consultanță financiară; benzile de preț sunt orientative; publicitatea nu reprezintă recomandări.
- L-04. La anunțurile publicate nativ: declarația vânzătorului că deține drepturile asupra fotografiilor încărcate.

---

## 9. Etape de dezvoltare și criterii de acceptare

### M0 — Fundația (≈1 săptămână)
Repo, CI/CD, medii, Supabase provisionat, schema + seed din secțiunea 5, design system portat din v5 (variabile CSS, fonturi, componente Plate/Card/Badge).
Acceptare: aplicația se deployează pe staging, seed-ul populează modelele și platformele, lighthouse mobile ≥ 90 pe pagina publică.

### M1 — Conturi + portarea aplicației (≈2 săptămâni)
Auth complet cu 2FA TOTP (A-01…A-06), portarea F-01…F-04 și F-06…F-07 pe conturi, importul backup-ului v5 în cont.
Acceptare: un utilizator nou se înregistrează, activează 2FA cu Google Authenticator sau Duo, importă backup-ul v5 și își regăsește lista; testul RLS (SEC-03) trece; login fără al doilea factor imposibil când 2FA e activ.

### M2 — Motorul de oferte (≈2 săptămâni)
Schema offers + scoring S-01, importul de rapoarte (I-02) mutat server-side cu deduplicare, tab-ul Top oferte alimentat din baza de date, publicarea nativă de anunțuri (I-03) cu moderare.
Acceptare: importul aceluiași raport de două ori nu creează duplicate; scorurile din platformă coincid cu formula v5 pe un set de 20 de oferte de test; un anunț nativ trece prin moderare și apare public.

### M3 — Notificări (≈1–2 săptămâni)
Preferințe utilizator, alerte email prin Resend cu șablonul Datenkarte, digest zilnic la plan gratuit / instant la premium, dezabonare cu un click, web push opțional.
Acceptare: la inserarea unei oferte cu scor ≥ pragul utilizatorului, emailul ajunge în inbox (test pe adresa beneficiarului) cu link funcțional către anunț; dezabonarea oprește emailurile; niciun utilizator nu primește mai mult de un digest/zi pe planul gratuit.

### M4 — Monetizare (≈1–2 săptămâni)
Stripe (plan premium lunar/anual), gating-ul funcțiilor premium, modulul de publicitate AD-03 cu CMP conform GDPR-03, linkuri de afiliere (carVertical/autoDNA) în fluxul de verificare istoric.
Acceptare: un abonament de test se cumpără și se anulează din portal; pozițiile publicitare afișează campania directă când există și AdSense altfel; consimțământul cookie blochează scripturile înainte de accept.

### M5 — Lansare (≈1 săptămână)
Panou admin complet, pagini legale, SEO (metadata, sitemap, OpenGraph cu blueprint-uri), monitorizare erori (Sentry), backup automat DB, test de încărcare de bază.
Acceptare: checklist de lansare semnat de beneficiar pe staging, apoi go-live pe domeniul de producție.

Testare continuă pe tot parcursul: unit pe scoring/verdicte (porturile exacte ale testelor din v5), integrare pe API, e2e (Playwright) pe fluxurile signup→2FA→import→alertă.

---

## 10. Costuri estimative de operare (start, lunar)

Vercel Pro ~20 $, Supabase Pro ~25 $, Resend ~0–20 $ (până la 50k emailuri), Stripe (comision per tranzacție), domeniu + email ~5 $, Sentry gratuit la volum mic. Total ordin de mărime 50–80 $/lună la lansare; scalează cu utilizatorii. Aceste estimări se verifică la momentul implementării.

---

## 11. Instrucțiuni de lucru pentru Claude Code

1. Citește integral acest document și fișierul `vanatorul-mercedes.html` (v5) înainte de a scrie cod — v5 conține design system-ul, textele finale în română, formulele de scoring și formatul JSON al agentului, toate de portat identic.
2. Lucrează în ordinea milestone-urilor M0→M5; la finalul fiecărui milestone rulează criteriile de acceptare și prezintă beneficiarului un demo pe staging înainte de a continua.
3. Nu hardcoda secrete, adrese de email personale sau chei; folosește variabile de mediu și seed-uri.
4. Orice conector de sursă nou se implementează doar după confirmarea bazei legale (secțiunea 8) cu beneficiarul.
5. La orice ambiguitate între acest document și v5, prevalează v5 pentru conținut/design și acest document pentru arhitectură/securitate.

— Sfârșitul caietului de sarcini —
