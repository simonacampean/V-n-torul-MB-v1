# M4 — Stadiu (04.07.2026)

Monetizare: Stripe (plan premium lunar/anual), modulul de publicitate AD-03, consimțământ
cookie GDPR-03 (Consent Mode v2), linkuri de afiliere carVertical/autoDNA.

## Criteriul de acceptare din caiet (secțiunea 9)
> Un abonament de test se cumpără și se anulează din portal; pozițiile publicitare afișează
> campania directă când există și AdSense altfel; consimțământul cookie blochează scripturile
> înainte de accept.

- [x] Stripe Checkout (subscription mode) + Customer Portal, planuri lunar/anual create prin API (`prod_UougYTsqV5Ct0T`)
- [x] Webhook semnat (`checkout.session.completed`, `customer.subscription.updated/deleted`) — sincronizează `subscriptions` + `profiles.role` (premium/user, `admin` protejat de trigger)
- [x] Migrarea `0008_stripe_billing.sql`: `protect_role_change()` permite `service_role` să schimbe rolul (webhook-ul rulează prin clientul admin)
- [x] AD-03: CRUD admin `/admin/publicitate`, sloturi publice `AdSlot` (campanie directă dacă există una activă în interval, altfel placeholder AdSense), tracking afișări/clickuri prin `/api/ads/impression` și `/api/ads/click/[id]`
- [x] GDPR-03: banner consimțământ, Consent Mode v2 (implicit `denied`, actualizat la accept), scriptul AdSense gatat de consimțământ
- [x] Linkuri afiliere carVertical/autoDNA pe ofertele fără istoric verificat, cu `rel="sponsored"`
- [x] **Verificat live de beneficiar**: abonare cu card de test (4242 4242 4242 4242) și anulare din Customer Portal — „funcționează corect la primele teste manuale"
- [x] **Verificat live în această conversație**: sesiune de checkout reală creată prin API, ofertă de test cu linkuri de afiliere randate corect în browser, meniul global și banner-ul de consimțământ confirmate vizual (desktop + mobil)

**136 teste automate trec** (14 noi față de finalul M3: `ads.test.ts`, `affiliates.test.ts`,
`consent.test.ts`, `stripe-webhook-route.test.ts` — acesta din urmă cu evenimente Stripe semnate
criptografic real, nu mock-uri). Typecheck, lint, build — verzi.

## Bug real găsit prin testare live (nu doar automată)
Butonul de abonare arăta „A apărut o eroare" fără nicio acțiune vizibilă. Două cauze suprapuse:

1. **`redirect()` dintr-un server action nu poate naviga către un domeniu extern** (Stripe
   Checkout) — Next.js tratează redirect-ul ca pe o navigare internă, iar către un URL extern eșuează
   silențios din perspectiva UI-ului. Corectat: `createCheckoutSession`/`createPortalSession`
   întorc acum `{url}` sau `{error}`, iar componenta client (`AbonamentActions.tsx`) face
   `window.location.assign(url)` ea însăși.
2. **`SUPABASE_SERVICE_ROLE_KEY` era setată gol (`""`) pe Vercel producție**, nu lipsă — probabil
   dintr-o rescriere anterioară greșită. Blocă orice cod care folosește clientul admin Supabase
   (necesar la crearea Customer-ului Stripe). Depistat din log-urile de producție
   (`vercel logs`): `Error: supabaseKey is required.` Corectat prin `vercel env rm` +
   `vercel env add` cu valoarea corectă din `.env.local`, apoi redeploy. Verificat direct în
   log-urile live: `POST /cont/abonament → 200 OK` după fix.

Notă utilă pentru depanări viitoare: `vercel env pull` afișează întotdeauna `""` pentru variabilele
de tip „Sensitive" (toate cele adăugate prin `vercel env add` din CLI, inclusiv cheile Stripe care
funcționau corect) — nu e un indiciu de valoare goală. Singura verificare fiabilă e comportamentul
la runtime, din `vercel logs` (fetch simplu, fără `--follow`, care s-a dovedit nefiabil în acest
mediu — nu a prins nicio cerere, nici măcar cele generate manual prin `curl`).

## Configurare aplicată (Stripe sandbox al beneficiarului)
Produs „Vânătorul MB Premium" + prețuri create prin API: 4,99 €/lună, 49 €/an (orientative,
ajustabile oricând din Stripe Dashboard fără schimbări de cod — `priceIdForPlan` citește ID-urile
din env). Webhook de producție înregistrat către `/api/webhooks/stripe`. Toate cele 4 variabile
Stripe + variabila Supabase corectată sunt setate în Vercel Production.

## Ce rămâne pentru milestone-urile viitoare (nu blochează M4)
- ID-uri reale de afiliat carVertical/autoDNA (`NEXT_PUBLIC_AFFILIATE_CARVERTICAL/AUTODNA`) —
  momentan linkurile duc la paginile publice, funcțional dar necomisionabil.
- Client ID AdSense real (`NEXT_PUBLIC_ADSENSE_CLIENT_ID`) — sloturile fără campanie directă
  afișează placeholder-ul „spațiu publicitar" din v5, nu reclame reale, până la aprobarea contului
  AdSense al beneficiarului.
- Trecerea Stripe din test-mode în live-mode la lansare (chei + webhook noi, aceeași arhitectură).
- Alerte email cu adevărat instant la planul premium — codul e pregătit (`isPremiumActive` din
  `lib/notifications.ts`), dar cronul Vercel rămâne o dată/zi (plan Hobby); necesită upgrade la
  Vercel Pro pentru un cron mai frecvent. Nu e cerut explicit de criteriul de acceptare M4 din
  caiet (secțiunea 9), care se referă la plată/anulare, sloturi publicitare și consimțământ cookie.
