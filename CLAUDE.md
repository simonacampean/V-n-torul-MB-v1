# CLAUDE.md — Instrucțiuni de lucru pentru proiectul „Vânătorul MB" v2.0

Acest repo este punctul de pornire al platformei SaaS „Vânătorul MB". Beneficiar: Alin Câmpean. Limba produsului și a comunicării: **româna**.

## Documente de referință (citește-le înainte de orice cod)
1. `docs/caiet-de-sarcini.md` — specificația completă: arhitectură, funcționalități, model de date, securitate, GDPR, milestone-uri M0–M5 cu criterii de acceptare.
2. `reference/vanatorul-mercedes-v5.html` — aplicația v5 funcțională: sursa de adevăr pentru design (CSS „Datenkarte"), toate textele finale în română, formulele de scoring (criterii ponderate, grade de stare, scor calitate-preț, prag de excelență 85) și formatul JSON al rapoartelor agentului.
3. `design/tokens.css` — variabilele de design extrase din v5, de importat global.

Regulă de arbitraj: la conflict, v5 prevalează pentru conținut/design, caietul de sarcini pentru arhitectură/securitate.

## Stadiul curent (actualizat 04.07.2026)
- M0 în mare parte livrat — detalii: `docs/M0-status.md`. Rămas: verificarea Lighthouse mobile ≥ 90 (nemăsurat încă în mediul de lucru curent).
- **M1 complet** (Auth + 2FA TOTP + F-01…F-04, F-06…F-07 pe conturi) — detalii: `docs/M1-status.md`.
- **M2 complet** (Motorul de oferte: schema `offers`, scoring S-01 via pg_cron, import I-02 cu deduplicare I-05, publicare nativă I-03 cu moderare AD-02) — detalii: `docs/M2-status.md`.
- **M3 complet** (Notificări: preferințe S-05, alerte email S-02/S-03 prin Resend, digest anti-spam S-04, dezabonare cu un click) — detalii: `docs/M3-status.md`. Verificat live: email real ajuns în inbox, anti-spam confirmat, dezabonare funcțională.
- Proiectul e live pe **https://vanatorul-mb.vercel.app**, cu deploy automat la fiecare push pe `main` (repo: `github.com/simonacampean/V-n-torul-MB-v1`). Cron job-urile Vercel rulează pe plan Hobby — max o dată/zi.
- **M4 complet** (Stripe checkout/portal/webhook, modul publicitate AD-03, consimțământ cookie GDPR-03 Consent Mode v2, linkuri afiliere carVertical/autoDNA) — detalii: `docs/M4-status.md`. Verificat live de beneficiar: abonare cu card de test și anulare din Customer Portal funcționează corect.
- UI: meniu global drop-down (buton ☰ în antet, `components/SiteMenu.tsx`) pe toate paginile; antet compact pe mobil.
- Următorul milestone: **M5 — Lansare** (panou admin complet, pagini legale, SEO, Sentry, backup automat DB, test de încărcare) — nu începe fără confirmarea explicită a beneficiarului.

## Fluxul de lucru
- Respectă ordinea milestone-urilor M0 → M5 din caiet. Nu începe un milestone nou înainte ca criteriile de acceptare ale celui curent să treacă.
- La finalul fiecărui milestone: rulează testele, prezintă beneficiarului un rezumat + demo (staging), așteaptă confirmarea.
- Commit-uri mici, mesaje în engleză convențională (`feat:`, `fix:`, `chore:`); cod comentat în română unde explică logică de business.
- Teste: portează întâi ca unit-tests formulele din v5 (verdicte de preț pe grade de stare, scorul ofertelor 0–100) — v5 conține cazurile de referință (ex.: W124, 8.500 €, stare 2, full, istoric, DA, DE, 125.000 km ⇒ scor 89, excelent).

## Reguli stricte (nu se negociază)
1. **Fără secrete în repo.** Totul prin variabile de mediu (`.env.example` e șablonul). Nu hardcoda emailuri personale, chei, ID-uri Stripe.
2. **Fără scraping împotriva ToS.** Conectoarele de surse se implementează doar cu bază legală documentată (caiet, secțiunile 4.2 și 8). Până atunci: link-out + import asistat + anunțuri native.
3. **Fără fotografii preluate din anunțurile terților.** Doar date factuale + link către sursă. Identitatea vizuală = blueprint-urile SVG proprii din v5.
4. **Securitate reală, nu decorativă:** RLS pe toate datele de utilizator (testul user-A-nu-vede-user-B e obligatoriu), MFA prin Supabase (nu criptografie proprie), validare server-side cu zod, sanitizare la afișare.
5. **GDPR:** export date, ștergere cont, consimțământ cookie (Consent Mode v2) — cerințe de lansare, nu „nice to have".

## Primele sarcini (M5 — Lansare)
1. Panou admin complet (dincolo de moderare oferte/publicitate deja existente).
2. Pagini legale (Termeni, Confidențialitate, GDPR) — conținut real, nu placeholder.
3. SEO: metadata per pagină, sitemap, OpenGraph cu blueprint-urile SVG proprii.
4. Monitorizare erori (Sentry) + backup automat DB.
5. Test de încărcare de bază, apoi checklist de lansare semnat de beneficiar pe staging → go-live.

## Restanțe cunoscute de M4 (netratate ca blocante, per criteriul de acceptare din caiet)
- ID-uri reale de afiliat carVertical/autoDNA și client ID AdSense — vezi `docs/M4-status.md`.
- Alerte email instant la premium — necesită Vercel Pro pentru cron mai frecvent de o dată/zi.
- Stripe rămâne în test-mode; trecerea la live-mode e o sarcină de lansare (M5).
