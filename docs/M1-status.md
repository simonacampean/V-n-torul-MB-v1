# M1 — Stadiu (03.07.2026)

Auth complet cu 2FA TOTP (A-01…A-06), portarea F-01…F-04 și F-06…F-07 pe conturi, import backup v5.

## Criteriul de acceptare din caiet (secțiunea 9)
> Un utilizator nou se înregistrează, activează 2FA cu Google Authenticator sau Duo, importă
> backup-ul v5 și își regăsește lista; testul RLS (SEC-03) trece; login fără al doilea factor
> imposibil când 2FA e activ.

- [x] Înregistrare + verificare email + login + logout global (A-01, A-04)
- [x] Politică de parole: minim 10 caractere + verificare HIBP k-anonymity (A-03)
- [x] 2FA TOTP: înrolare QR, 10 coduri de rezervă, verificare la login, dezactivare doar cu cod valid (A-02)
- [x] Recuperare cont: reset parolă NU dezactivează 2FA (A-05)
- [x] Roluri + RLS pe toate tabelele cu date de utilizator (A-06)
- [x] Testat manual, în browser, cu Google Authenticator real — login cere corect codul
- [x] Testul RLS (SEC-03) — automat, live pe Supabase Cloud (`tests/rls.test.ts`)
- [x] Import backup v5 (format vechi, localStorage) — testat manual cu fișier real în format v5
- [x] F-01/F-02: Vânătoare zilnică per cont (`/cont/vanatoare`), bifă zilnică persistată în `user_prefs`
- [x] F-03: Lista mea — CRUD, scoring pe 6 criterii ponderate, pipeline statusuri, istoric preț, comparator
- [x] F-04: Evaluator de preț — verdict live la adăugarea unui anunț
- [x] F-06: Ghid & RO — 4 pagini de conținut, portate din v5
- [x] F-07: Export/import backup JSON — acceptă atât formatul propriu, cât și v5 legacy

**50 teste automate trec** (unit + integrare live pe Supabase Cloud). Typecheck, lint, build — verzi.

## Bug-uri reale găsite prin testare manuală (nu doar automată)
1. Redirect infinit `/cont` ↔ `/verifica-2fa` după recuperare prin cod de rezervă — sesiunea
   existentă citea AAL din cache local, nu live. Fix: `refreshSession()` explicit + test de regresie.
2. Contrast alb-pe-alb pe titlurile paginilor din cont — reutilizare greșită a clasei `.brand`
   (gândită doar pentru antetul întunecat). Fix: clasă separată `.page-title`.
3. Lipsă navigare vizibilă între paginile din cont — adăugat meniu lateral persistent (`ContSidebar`).

## Note de arhitectură / decizii deliberate față de v5
- Import backup: v5 **înlocuia** toată lista la import; aici **adaugă** la lista existentă
  (deduplicare pe URL) — pentru că datele sunt acum pe cont, nu pe dispozitiv, iar un import
  destructiv ar risca ștergerea accidentală a datelor sincronizate.
- Nota despre PWA din Ghid & RO adaptată: v5 vorbea despre „date salvate pe dispozitiv"
  (localStorage); în v2.0 datele sunt legate de cont.
- „Top oferte (Agent)" (F-05) rămâne pentru M2, conform planului din caiet — nu a fost inclus în M1.

## Ce rămâne deschis (nu blochează M1, dar merită urmărit)
- Linkurile de confirmare email pot fi consumate de scannere automate înainte de click-ul
  utilizatorului (`otp_expired` deși contul se confirmă oricum) — de luat în calcul trecerea la
  cod OTP de 6 cifre dacă devine o problemă recurentă la utilizatori reali.
