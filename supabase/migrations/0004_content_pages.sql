-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0004: conținut Ghid & RO (M1, F-06)
-- Textul e portat din reference/vanatorul-mercedes-v5.html (tab-ul „Ghid & RO"),
-- cu o singură adaptare de conținut: nota despre PWA nu mai vorbește de
-- „date salvate pe dispozitiv" — în v2.0 datele sunt legate de cont, nu de
-- localStorage, deci fraza din v5 ar fi factual greșită dacă ar fi portată identic.
-- ============================================================

update public.content_pages set
  title = 'Modalități de achiziție',
  published = true,
  body = '- **1. Direct de la privat (DE/AT/FR/IT/ES)** — cel mai bun preț, negociabil. Obligatoriu: inspecție la fața locului sau expert independent (DEKRA/TÜV, ~100–150 €). Contract scris, acte complete.
- **2. Dealer specializat în clasice** — preț mai mare, negociere limitată (5–10%), dar garanție și acte impecabile.
- **3. Licitații (Collecting Cars, Catawiki, Car & Classic)** — prețul NU e negociabil, îl fac bid-urile; vezi în schimb prețul real de piață. Setează-ți limita ÎNAINTE și n-o depăși.
- **4. Piața locală (Autovit/OLX)** — fără costuri de import, negociabil, dar ofertă mică. Verifică istoric daune în baza RAR.
- **Verificare istoric înainte de drum:** raport VIN (carVertical / autoDNA, ~20–30 €) + istoricul de daune RAR pentru mașinile din RO.
- **Transport:** platformă ~300–800 € din DE, 800–1.200 € din ES/PT. Alternativ numere de export (~100–150 €, 30 zile) și condus personal.'
where slug = 'ghid-achizitie';

update public.content_pages set
  title = 'Înmatriculare în România (import UE)',
  published = true,
  body = '- **Da, toate modelele țintă se pot înmatricula.** Pentru mașini din UE nu există taxe vamale și nici taxă de poluare. TVA nu se datorează în RO la mașini rulate (peste 6 luni ȘI peste 6.000 km) de la privat sau în regim de marjă — valabil și pentru IT/ES/FR/GR/PT.
- **Traseul:** ① numere roșii provizorii (DRPCIV) → ② RAR: CIV, certificat de autenticitate, ITP (~740–1.200 RON, programare pe rarom.ro) → ③ Direcția Taxe și Impozite → ④ ANAF: certificat TVA → ⑤ DRPCIV: talon (~50 RON) + plăcuțe (~40–85 RON).
- **Costuri totale:** tipic 1.500–2.000 RON cu acte complete + traduceri (60–100 RON/doc) + RCA pe serie de șasiu. Durată: 30–60 zile (sau ~10 zile printr-o firmă, 500–1.500 RON).
- **Acte fără de care NU cumperi:** documentele de înmatriculare din țara de origine (brief mare+mic DE / libretto IT / permiso de circulación ES), contract sau factură clară, carnet de service. Pre-2018 nu e necesar CoC.
- **Bonus vehicul istoric (30+ ani):** atestare prin Retromobil Club România (FIVA) — avantaje la impozit local, asigurare de colecție, ITP extins. Verifică condițiile curente.'
where slug = 'ghid-inmatriculare-ro';

update public.content_pages set
  title = 'Strategia de deținere (5–10 ani)',
  published = true,
  body = '- **Bugetează 15–20% peste prețul de achiziție** — transport, înmatriculare, service de intrare. Calculatorul „la cheie în RO" folosește +1.500 € ca estimare standard.
- **Kilometrajul optim la cumpărare: 80.000–150.000 km documentați.** Rulajul foarte mic ia prima cea mai mare, dar orice km condus i-o consumă; 150.000 km rămâne bariera psihologică la revânzare.
- **Gradele de stare din aplicație:** #1 Concurs (+30% peste banda de bază), #2 Excelentă (banda de referință), #3 Bună (−30%), #4 Proiect (−55%). Evaluează sincer — majoritatea anunțurilor „impecabile" sunt de fapt #3.
- **Depozitare corectă = jumătate din investiție.** Garaj uscat, aerisit, husă respirantă, baterie pe menținere.
- **Documentează tot de la ziua 1:** dosar cu facturi, poze, întreținerea ta. La revânzare adaugă 10–20% la preț.
- **Condu mașina — 1.000–3.000 km/an.** Piața din 2026 premiază exemplarele întreținute mecanic și folosite.
- **Nu cumpăra niciodată nevăzut** fără inspecție independentă.
- **Asigurare de colecție** (valoare agreată) după înmatriculare.'
where slug = 'strategia-detinere';

update public.content_pages set
  title = 'Instalează aplicația pe telefon',
  published = true,
  body = '- **iPhone (Safari):** deschide pagina → butonul „Share" (pătratul cu săgeată) → **„Add to Home Screen / Adaugă la ecranul principal"**.
- **Android (Chrome):** deschide pagina → meniul ⋮ → **„Adaugă la ecranul de pornire / Instalează aplicația"**.
- Datele contului tău sunt legate de cont, nu de dispozitiv — te autentifici de pe orice telefon sau laptop și regăsești aceeași Listă mea.'
where slug = 'instalare-pwa';
