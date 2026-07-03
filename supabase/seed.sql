-- ============================================================
-- VÂNĂTORUL MB v2.0 — Seed (valorile exacte din aplicația v5)
-- Rulare: supabase db reset (rulează migrări + seed) sau psql -f seed.sql
-- ============================================================

-- ---------- Setări globale ----------
insert into public.app_settings (key, value) values
  ('reg_cost_eur', '900'),
  ('excellence_threshold', '85'),
  ('max_budget_default', '20000')
on conflict (key) do update set value = excluded.value;

-- ---------- Costuri de transport către România (EUR) ----------
insert into public.transport_costs (country_code, cost_eur) values
  ('RO',0),('DE',600),('AT',500),('HU',300),('FR',800),('IT',800),
  ('NL',700),('BE',700),('ES',1100),('PT',1200),('GR',1100),
  ('UK',1300),('CH',700),('PL',400),('CZ',400)
on conflict (country_code) do update set cost_eur = excluded.cost_eur;

-- ---------- Cele 6 modele țintă ----------
insert into public.target_models
 (code,name,years,year_from,year_to,band_lo,band_hi,body,thesis,checklist,tags,verdict,gallery_query,prod_note,hunt_query) values
('W124','Mercedes-Benz W124 / C124 Coupé','1984–1997',1984,1997,9000,18000,'coupe',
 'Ultimul Mercedes construit „fără buget" — reper absolut de fiabilitate. Sedanurile sunt numeroase, dar exemplarele originale, neruginite, cu istoric complet au devenit rare. Coupé-ul C124 (300CE / E320) e alegerea de investiție: producție mică, design Bruno Sacco, cel mai căutat de colecționari.',
 '["Rugină: pragurile, punctele de cric, aripile spate, capacul portbagajului","Cablajul motor M104 (1992–1995): izolație biodegradabilă — verifică dacă a fost înlocuit","Cutia automată: schimburi line, ulei curat","Interior original, netăiat, fără găuri de accesorii"]',
 '["Fiabilitate ★★★","Comunitate uriașă","Coupé = raritate","Potențial ridicat"]',
 'PRIORITATE MAXIMĂ — coupé C124, sub 150.000 km','Mercedes C124 300CE coupe','~2,7 mil. total · Coupé C124: doar ~141.000','W124'),
('R129','Mercedes-Benz SL (R129)','1989–2001',1989,2001,13000,20000,'roadster',
 'Roadsterul „over-engineered" al anilor ''90, nedumeritor de ieftin pentru ce oferă. Decapotabilele se apreciază istoric mai bine decât coupé-urile, iar R129 e ultimul SL din epoca de aur a calității Mercedes. SL320 (6 cil.) și SL500 (V8) sunt în buget la exemplare bune.',
 '["Softtop-ul și mecanismul hidraulic al plafonului — reparațiile sunt scumpe","Rugină: arcade roți, sub bandourile laterale","Istoric service complet — motoarele M104/M119 sunt eterne DOAR cu întreținere","Hardtop-ul original inclus = plus de valoare"]',
 '["Decapotabilă","V8 accesibil","Sub radar","Creștere lentă și sigură"]',
 'CUMPĂRĂ ACUM — fereastra sub 20k se închide pentru SL500','Mercedes SL R129 roadster','~204.000 buc. în 12 ani — puțin pentru un SL','SL R129'),
('W201','Mercedes-Benz 190E (W201)','1982–1993',1982,1993,8000,16000,'sedan',
 '„Baby Benz"-ul care a definit calitatea compactă. Versiunile 2.6 (6 cilindri) și pachetul Sportline sunt cele colecționabile — restul rămân mașini bune, dar comune. Fratele 2.5-16 Evo a explodat deja ca preț; efectul se scurge în jos spre 2.6 și Sportline.',
 '["Caută DOAR 2.6 sau Sportline, ideal cu manuală","Rugină: aripi față, praguri sub bandouri","Kilometraj real documentat — multe au fost date înapoi","Originalitate 100%: fără eleroane, jante sau volane aftermarket"]',
 '["Icon anii ''80","Efect 2.5-16","Piese ieftine","Comunitate mare"]',
 'SELECTIV — doar 2.6 / Sportline impecabile','Mercedes 190E W201','~1,88 mil. · 2.6 și Sportline: fracțiune mică','190E W201'),
('W126','Mercedes-Benz S-Klasse (W126)','1979–1991',1979,1991,10000,18000,'sedan',
 'Cel mai reușit S-Klasse din istorie, 12 ani în producție fără rival. Sedanurile V8 (420SE/500SE) sunt în buget și cresc constant; coupé-ul SEC e ținta ideală, dar exemplarele bune depășesc deja 20k — dacă prinzi unul corect în buget, e lovitura de grație.',
 '["Lanț de distribuție simplu vs dublu la V8-urile timpurii — verifică istoricul","Rugină: parbriz, praguri, sub bateria din portbagaj","Suspensie hidraulică spate (unde există) — funcțională","Istoric de garaj: mașinile astea sufereau iarna"]',
 '["V8 de colecție","Statut blue-chip","SEC = jackpot","Eleganță Sacco"]',
 'OPORTUNIST — sedan V8 excelent sau SEC sub-evaluat','Mercedes W126 500SE','~818.000 sedan · Coupé SEC: ~74.000','W126'),
('W123','Mercedes-Benz W123','1976–1985',1976,1985,8000,16000,'coupe',
 'Indestructibilul absolut — legenda fiabilității Mercedes. Statut de clasic deja consolidat (40+ ani), eligibil pentru înmatriculare de vehicul istoric în România. Coupé-ul 230CE/280CE e varianta de investiție; sedanul e varianta de siguranță.',
 '["Rugină — inamicul #1: aripi, praguri, podea, suporturi de cric","Motoarele merg veșnic; caroseria decide prețul","Documentație istorică: carnet service, facturi vechi","Culori de epocă originale (nu revopsit în negru modern)"]',
 '["Fiabilitate legendară","Vehicul istoric RO","Comunitate globală","Risc minim"]',
 'SIGURANȚĂ — coupé CE original, cel mai bun exemplar disponibil','Mercedes W123 280CE coupe','~2,7 mil. · Coupé CE: ~100.000','W123'),
('W140','Mercedes-Benz S-Klasse (W140)','1991–1998',1991,1998,6000,13000,'sedan',
 'Ultimul Mercedes proiectat fără compromisuri de cost. Azi e cel mai ieftin bilet spre statutul de colecție viitor: generația care l-a admirat în anii ''90 intră acum la putere de cumpărare. Coupé-ul C140 (doar ~26.000 buc.) e raritatea reală din buget.',
 '["Cablaj motor biodegradabil (1993–1995) — înlocuit sau nu","Sisteme electrice și pneumatice: totul trebuie să funcționeze","Evită exemplarele „de fițe” modificate — doar 100% original","Costuri de întreținere mari: cumpără cel mai bun, nu cel mai ieftin"]',
 '["Pariu pe viitor","C140 = producție mică","Încă ieftin","Trend youngtimer"]',
 'SPECULATIV — C140 coupé original sau S500 impecabil','Mercedes W140 S500','~406.000 · Coupé C140: ~26.000','W140')
on conflict (code) do nothing;

-- ---------- Cele 16 platforme (3 grupe, cu negociabilitate) ----------
insert into public.platforms (name,country,grp,negotiability,note,url_template,connector_type,legal_basis) values
('mobile.de','DE','major','DA','Cea mai mare piață din Europa',
 'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&makeModelVariant1.makeId=17200&makeModelVariant1.modelDescription={query}&maxPrice=20000&minFirstRegistrationDate={yearFrom}-01-01&maxFirstRegistrationDate={yearTo}-12-31','manual','Link-out către sursă; fără scraping (ToS)'),
('AutoScout24','EU','major','DA','Filtre bune, anunțuri din toată UE',
 'https://www.autoscout24.ro/lst/mercedes-benz?fregfrom={yearFrom}&fregto={yearTo}&priceto=20000&sort=age&desc=0','manual','Link-out; de evaluat programul de parteneriat'),
('Kleinanzeigen','DE','major','DA','Privați germani — prețuri directe',
 'https://www.kleinanzeigen.de/s-autos/mercedes-{querySlug}/k0c216','manual','Link-out; de evaluat eBay Browse API'),
('Autovit.ro','RO','major','DA','Local — fără costuri de import',
 'https://www.autovit.ro/autoturisme/mercedes-benz/de-la-{yearFrom}?search%5Bfilter_float_price%3Ato%5D=20000','manual','Link-out'),
('Leboncoin','FR','med','DA','Sudul Franței = zona de aur',
 'https://www.leboncoin.fr/recherche?category=2&text=mercedes%20{query}','manual','Link-out'),
('AutoScout24.it','IT','med','DA','Nordul Italiei, mașini de garaj',
 'https://www.autoscout24.it/lst/mercedes-benz?fregfrom={yearFrom}&fregto={yearTo}&priceto=20000&sort=age&desc=0','manual','Link-out'),
('Subito.it','IT','med','DA','Privați italieni, prețuri mici',
 'https://www.subito.it/annunci-italia/vendita/auto/?q=mercedes%20{query}','manual','Link-out'),
('Coches.net','ES','med','DA','Spania interioară = cel mai uscat climat',
 'https://www.coches.net/segunda-mano/?Text=mercedes%20{query}','manual','Link-out'),
('Standvirtual','PT','med','DA','Portugalia — piață mică, subevaluată',
 'https://www.standvirtual.com/carros/mercedes-benz?search%5Bfilter_float_price%3Ato%5D=20000','manual','Link-out'),
('Car.gr','GR','med','DA','Grecia — atenție la mașinile de coastă',
 'https://www.car.gr/classifieds/cars/?q=mercedes%20{query}','manual','Link-out'),
('Classic Trader','EU','collect','PARTIAL','Dealeri de clasice verificați',
 'https://www.classic-trader.com/uk/cars/search?keyword=Mercedes%20{query}&price_to=20000','manual','Link-out; de evaluat feed de parteneriat'),
('Classic Driver','EU','collect','PARTIAL','Segment premium, exemplare top',
 'https://www.classicdriver.com/en/cars?query=mercedes%20{query}','manual','Link-out'),
('Car & Classic','UK/EU','collect','DA','Anunțuri + licitații, ofertă mare',
 'https://www.carandclassic.com/search?q=mercedes%20{query}','manual','Link-out'),
('Collecting Cars','UK/EU','collect','NU','Licitații — preț real de piață',
 'https://collectingcars.com/search?query=Mercedes%20{query}','manual','Link-out'),
('Catawiki','NL/EU','collect','NU','Licitații săptămânale, ofertă variată',
 'https://www.catawiki.com/en/s?q=mercedes%20{query}','manual','Link-out; de evaluat programul de afiliere'),
('Classic.com','GLOBAL','collect','REF','REFERINȚĂ DE PREȚ: istoricul vânzărilor',
 'https://www.classic.com/search/?q=mercedes%20{query}','manual','Link-out')
on conflict (name) do nothing;

-- ---------- Paginile de conținut (F-06, portate din v5, tab Ghid & RO) ----------
insert into public.content_pages (slug,title,body,published) values
('ghid-achizitie','Modalități de achiziție',
'- **1. Direct de la privat (DE/AT/FR/IT/ES)** — cel mai bun preț, negociabil. Obligatoriu: inspecție la fața locului sau expert independent (DEKRA/TÜV, ~100–150 €). Contract scris, acte complete.
- **2. Dealer specializat în clasice** — preț mai mare, negociere limitată (5–10%), dar garanție și acte impecabile.
- **3. Licitații (Collecting Cars, Catawiki, Car & Classic)** — prețul NU e negociabil, îl fac bid-urile; vezi în schimb prețul real de piață. Setează-ți limita ÎNAINTE și n-o depăși.
- **4. Piața locală (Autovit/OLX)** — fără costuri de import, negociabil, dar ofertă mică. Verifică istoric daune în baza RAR.
- **Verificare istoric înainte de drum:** raport VIN (carVertical / autoDNA, ~20–30 €) + istoricul de daune RAR pentru mașinile din RO.
- **Transport:** platformă ~300–800 € din DE, 800–1.200 € din ES/PT. Alternativ numere de export (~100–150 €, 30 zile) și condus personal.',true),
('ghid-inmatriculare-ro','Înmatriculare în România (import UE)',
'- **Da, toate modelele țintă se pot înmatricula.** Pentru mașini din UE nu există taxe vamale și nici taxă de poluare. TVA nu se datorează în RO la mașini rulate (peste 6 luni ȘI peste 6.000 km) de la privat sau în regim de marjă — valabil și pentru IT/ES/FR/GR/PT.
- **Traseul:** ① numere roșii provizorii (DRPCIV) → ② RAR: CIV, certificat de autenticitate, ITP (~740–1.200 RON, programare pe rarom.ro) → ③ Direcția Taxe și Impozite → ④ ANAF: certificat TVA → ⑤ DRPCIV: talon (~50 RON) + plăcuțe (~40–85 RON).
- **Costuri totale:** tipic 1.500–2.000 RON cu acte complete + traduceri (60–100 RON/doc) + RCA pe serie de șasiu. Durată: 30–60 zile (sau ~10 zile printr-o firmă, 500–1.500 RON).
- **Acte fără de care NU cumperi:** documentele de înmatriculare din țara de origine (brief mare+mic DE / libretto IT / permiso de circulación ES), contract sau factură clară, carnet de service. Pre-2018 nu e necesar CoC.
- **Bonus vehicul istoric (30+ ani):** atestare prin Retromobil Club România (FIVA) — avantaje la impozit local, asigurare de colecție, ITP extins. Verifică condițiile curente.',true),
('strategia-detinere','Strategia de deținere (5–10 ani)',
'- **Bugetează 15–20% peste prețul de achiziție** — transport, înmatriculare, service de intrare. Calculatorul „la cheie în RO" folosește +1.500 € ca estimare standard.
- **Kilometrajul optim la cumpărare: 80.000–150.000 km documentați.** Rulajul foarte mic ia prima cea mai mare, dar orice km condus i-o consumă; 150.000 km rămâne bariera psihologică la revânzare.
- **Gradele de stare din aplicație:** #1 Concurs (+30% peste banda de bază), #2 Excelentă (banda de referință), #3 Bună (−30%), #4 Proiect (−55%). Evaluează sincer — majoritatea anunțurilor „impecabile" sunt de fapt #3.
- **Depozitare corectă = jumătate din investiție.** Garaj uscat, aerisit, husă respirantă, baterie pe menținere.
- **Documentează tot de la ziua 1:** dosar cu facturi, poze, întreținerea ta. La revânzare adaugă 10–20% la preț.
- **Condu mașina — 1.000–3.000 km/an.** Piața din 2026 premiază exemplarele întreținute mecanic și folosite.
- **Nu cumpăra niciodată nevăzut** fără inspecție independentă.
- **Asigurare de colecție** (valoare agreată) după înmatriculare.',true),
('instalare-pwa','Instalează aplicația pe telefon',
'- **iPhone (Safari):** deschide pagina → butonul „Share" (pătratul cu săgeată) → **„Add to Home Screen / Adaugă la ecranul principal"**.
- **Android (Chrome):** deschide pagina → meniul ⋮ → **„Adaugă la ecranul de pornire / Instalează aplicația"**.
- Datele contului tău sunt legate de cont, nu de dispozitiv — te autentifici de pe orice telefon sau laptop și regăsești aceeași Listă mea.',true)
on conflict (slug) do nothing;
