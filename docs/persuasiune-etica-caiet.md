# Caiet de sarcini — Design persuasiv etic (6 piloni)

Bazat pe analiza stării curente (04.07.2026). Fiecare punct: ce lipsește, ce construim, unde.
Persuasiune etică = pe bază de date reale (zile pe piață, bandă de preț reală) — nu presiune
artificială sau frică indusă.

## P1 — Claritate (înțelegere în 5 secunde)
- [ ] Subtitlu scurt sub antet pe homepage: ce e platforma, într-o frază, vizibil fără scroll.
- [ ] Verificare: un singur buton roșu (primary) per card de ofertă pe `/oferte` (deja adevărat, de reconfirmat).

## P2 — Credibilitate
- [ ] Disclaimer „nu este consultanță financiară" vizibil pe `/oferte`, lângă listă, nu doar pe homepage.
- [ ] „Ultima actualizare: acum X zile" pe fiecare card din `/oferte`, din `offers.last_seen` (coloană existentă, neafișată).

## P3 — Viteză percepută
- [ ] `loading.tsx` cu schelete (skeleton cards) pentru `/oferte` — pagina cu interogare live, cea mai expusă la ecran alb.
- [ ] Stare `:active` (feedback instant la atingere) pe `.btn` și `.offer` — CSS, respectă `prefers-reduced-motion` existent.

## P4 — Emoție
- [x] Fotografie model înaintea cifrelor pe homepage — deja livrat (sesiunea anterioară).
- [ ] Micro-animație (puls subtil) pentru badge-urile „EXCELENTĂ" și „CHILIPIR" — respectă `prefers-reduced-motion`.
- [ ] Reformulare copy: verdictul de chilipir din „⚠ CHILIPIR POTENȚIAL" spre o formulare care confirmă câștigul, păstrând avertismentul de verificare.

## P5 — Mobile-first
- [ ] `inputMode="numeric"` pe câmpul „Preț maxim" din toolbar-ul `/oferte` (omis la construcția inițială).
- [ ] Reconfirmare `--touch-min` pe toate elementele noi din toolbar (select-uri, buton filtrează).

## P6 — Persuasiune etică (pe date reale)
- [ ] „Pe piață de X zile" pe fiecare card din `/oferte`, din `offers.first_seen` — semnal de urgență reală, nu inventată.
- [ ] Bandă de preț a modelului afișată lângă prețul ofertei („bandă model: X–Y €") — ancoră vizuală directă, nu doar codificată în scor.
- [ ] Confirmare vizuală explicită la acțiuni cheie (ex.: adăugare în Lista mea) — moment scurt de confirmare, nu doar refresh tăcut.

## Verificare finală
- [ ] Teste + typecheck + lint + build.
- [ ] Verificare vizuală live (desktop + mobil) pentru fiecare pilon.
