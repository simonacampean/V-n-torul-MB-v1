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
