# Audit UX / Behavioral Design / Persuasive Design — Vânătorul MB

**Data:** 05.07.2026 · **Metodă:** lectură directă a codului sursă (29 ecrane: homepage, auth, `/cont/*`, `/admin/*`, legale), nu doar inspecție externă — inclusiv zonele care necesită autentificare, la care un audit extern (browser fără cont) nu are acces.

---

## 1. Scoruri generale

| Dimensiune | Scor | Notă |
|---|---|---|
| UX | **78/100** | Flow-uri centrale solide; Lista mea și formularele admin trag scorul în jos |
| UI | **82/100** | Sistem de design disciplinat (Datenkarte); depunctat pt. iconografie emoji și text mono foarte mic |
| Behavioral Design | **68/100** | Loss aversion + default bias bine folosite; lipsesc social proof, goal gradient, endowed progress |
| Persuasive Design (etic) | **80/100** | Zero dark patterns identificate; nuanțat de vizibilitate slabă a progresului și dialoguri native browser |
| Accesibilitate | **70/100** | Bază bună (focus-visible, role=alert/status, prefers-reduced-motion) dar text mic + emoji-ca-iconițe + window.prompt/confirm netestabile |
| Claritate | **83/100** | P1-P6 (sesiunea anterioară) au ridicat mult scorul; abonament și admin/modele rămân neclare |
| Reducere Fricțiune | **66/100** | Cel mai mare potențial de îmbunătățire — formulare lungi, fără validare inline, fără feedback de încărcare |

---

## 2. Scor UX per ecran

| Ecran | Scor | Observație principală |
|---|---|---|
| `/` Homepage | 82 | Card-uri model scanabile, o singură acțiune per card |
| `/autentificare` | 88 | Minimal, 2 câmpuri, clar |
| `/inregistrare` | 75 | Fără feedback în timp real la politica de parolă (min 10 + HIBP se verifică doar server-side, după submit) |
| `/verifica-2fa` | 85 | Simplu, un singur câmp |
| `/cont` (dashboard) | 85 | Onboarding + 3 acțiuni clare (deja optimizat) |
| `/cont/vanatoare` | 72 | Grupare bună pe platforme, dar volum mare de linkuri externe deodată |
| `/cont/lista` | **60** | Cel mai încărcat ecran din toată aplicația (vezi §7) |
| `/cont/oferte/import` | 85 | Un textarea + un buton, ideal |
| `/cont/oferte/publica` | 70 | 10 câmpuri într-un singur pas, fără grupare |
| `/cont/preferinte` | 65 | Listă plată de 15 țări, fără grupare/căutare |
| `/cont/securitate` | 88 | Bun exemplu de progressive disclosure (înrolare → QR → coduri → activ) |
| `/cont/date` | 85 | Fricțiune calibrată corect (parolă + bifă pt. ștergere) |
| `/cont/abonament` | 72 | Nu arată prețul înainte de click pe „Abonează-te” |
| `/cont/ghid` | 80 | Conținut simplu, corect |
| `/admin` (dashboard) | 85 | KPI clare, fără trend/direcție vizuală |
| `/admin/oferte` | 78 | Aprobare/respingere clară, fără acțiuni bulk |
| `/admin/modele` | **62** | Formular de 16 câmpuri într-un singur pas, fără validare client-side |
| `/admin/platforme` | 75 | Formular mai scurt, aceeași lipsă de validare |
| `/admin/publicitate` | 80 | Feedback real (afișări/clickuri vizibile inline) |

---

## 3. Behavioral Design — principii

| Principiu | Status | Detaliu |
|---|---|---|
| **Hick's Law** | 🔴 Încălcat | Sidebar cont: 11 linkuri (16 pt. admin) fără grupare vizuală. Preferințe: 15 țări plate. Admin/modele: 16 câmpuri plate. |
| **Fitts' Law** | 🟠 Parțial | `.btn` respectă `min-height: 40px`, dar `window.prompt`/`window.confirm` (Lista mea) sunt dialoguri native, nestilizate, cu targets inconsistente |
| **Goal Gradient Effect** | 🔴 Absent | Nicio bară/procent de progres nicăieri (nici la 2FA setup, care s-ar preta perfect) |
| **Peak-End Rule** | 🟠 Parțial | Momente de vârf bune (✓ Adăugat, 🎯 CHILIPIR) dar niciun moment de final marcant (ex. după abonare reușită — doar text simplu) |
| **Zeigarnik Effect** | 🔴 Absent | Scorul pe 6 criterii (Lista mea) e calculat dar nu afișat ca „4/6 criterii — mai ai 2” |
| **Loss Aversion** | 🟢 Bine folosit | Chip „−X% preț”, „⏳ zile pe piață — negociază agresiv”, verdict CHILIPIR — toate pe date reale |
| **Commitment & Consistency** | 🟠 Slab | Doar bifa ToS la înregistrare; nimic la onboarding (ex. „alege 3 modele care te interesează”) |
| **Social Proof** | 🔴 Absent | Zero cifre comunitare publice, deși `/admin` calculează exact acest gen de date (utilizatori, oferte) |
| **Default Bias** | 🟢 Bine folosit | `email_alerts` implicit true, stare implicită „#2 Excelentă”, țară implicită RO |
| **Endowed Progress** | 🔴 Absent | Banner onboarding ①②③ e static — nu marchează pașii deja făcuți |
| **Progressive Disclosure** | 🟠 Inconsecvent | Excelent în Securitate 2FA; absent în admin/modele și Lista mea |

---

## 4. Persuasive Design (etic)

**Verdict: nu am identificat dark patterns** — nicio urgență artificială, fără countdown fals, fără forced continuity vizibil în cod. Verdictele „chilipir”/„stale” sunt calculate din `first_seen`/`last_seen`/bandă reală de preț, nu simulate.

| Element | Status |
|---|---|
| Claritate | 🟢 Bun (după P1) — cu excepția abonament/admin |
| Feedback instant | 🟠 `agentmsg` bun, dar niciun spinner nicăieri — butoanele doar se dezactivează, fără indicator vizual de „se procesează” |
| Reducerea anxietății | 🟢 Excelent la ștergere cont (grație 30 zile, anulabil) |
| Reducerea efortului mental | 🔴 Lista mea + admin/modele violează puternic |
| Micro-copy | 🟢 Punct forte real — voce umană, consecventă („Bine ai venit, vânătorule”) |
| CTA-uri | 🟠 Bune per secțiune, dar Lista mea are 5 controale cu aceeași greutate vizuală |
| Confirmări inteligente | 🔴 `window.confirm()` la ștergere item — nestilizat, fără undo, contrastează cu fluxul corect calibrat de la ștergere cont |
| Progres vizibil | 🔴 Absent sistematic (vezi Goal Gradient/Zeigarnik) |
| Nudges etice | 🟢 CHILIPIR, price-drop, stale-listing — toate pe date reale, non-manipulative |

---

## 5. Conversational UX

Nu există un asistent conversațional orientat spre utilizatorul final (rutina Claude programată e un proces admin/backend care alimentează draft-uri de moderare, nu o interfață de chat). Singura suprafață „conversațională” e caseta de import raport (`/cont/oferte/import`): nu e conversație, ci paste-and-parse, dar mesajele de rezultat sunt clare și specifice („X noi, Y actualizate, Z sărite”) — un punct forte în sine.

---

## 6. Information Architecture

- **Meniu:** `ContSidebar` e o listă plată fără secțiuni. Linkurile admin sunt concatenate direct după cele de user, **fără niciun separator vizual** — un admin poate confunda ușor unde se termină zona de user și începe cea de admin.
- **Grupare:** Vânătoare zilnică grupează platformele pe categorii (major/mediu/colecție) — model bun, dar **neaplicat consecvent** (Preferințe nu grupează cele 15 țări la fel).
- **Prioritizare:** `/cont` prioritizează corect 3 acțiuni; sidebar-ul nu diferențiază vizual greutatea funcțiilor (font/mărime identice pentru tot).

---

## 7. UI Design

- **Contrast/tipografie:** sistem dual (Archivo + IBM Plex Mono) coerent cu identitatea „Datenkarte”. Riscul: text meta la 10-11px, gri (`--inksoft`/`--plateedge`) — combinația mărime-mică + contrast-redus e un risc de accesibilitate cumulat, de verificat cu Lighthouse/axe.
- **Ierarhie vizuală:** border-left colorat pe scor (verde=excelent, roșu=chilipir) — punct forte real, foarte scanabil.
- **Culori:** mapare semantică roșu/verde/amber consecventă în tot codul (neg.*, chip.*, status.*).
- **Iconografie:** aproape exclusiv emoji (🔍✓⭳💶🎯📷) — randare inconsecventă cross-OS/browser, ruptură de stil față de restul sistemului tipografic controlat.
- **Responsive:** breakpoints explicite confirmate în cod pentru toate grid-urile cheie (`.formgrid`, `.crit`, `.toolbar`, `.cont-layout`) — disciplină bună.

---

## 8. Reducerea fricțiunii — pe acțiune

| Acțiune | Problemă | Soluție |
|---|---|---|
| Adaugă în Lista mea | 8 câmpuri retastate manual, deși userul vine cu linkul deschis din Vânătoare zilnică | Auto-completare din link lipit, sau reducerea câmpurilor obligatorii |
| Publică anunț | 10 câmpuri, un pas, o singură eroare generică | Validare inline per câmp |
| Admin → Model nou | 16 câmpuri, un pas, zero validare client-side (a produs deja 2 bug-uri reale în sesiunea anterioară: `hunt_query` lipsă, checkbox `null`) | Împarte în 2 pași (identitate → preț & conținut) |
| Șterge item din Listă | `window.confirm()` — mai puțină fricțiune reală decât pare, fără undo | Confirmare inline stilizată (pattern deja existent: `.confirm-added`) |
| Preferințe → țări | Perete de 15 checkbox-uri plate | Buton „Selectează recomandate” + căutare |
| Vânătoare zilnică | Fiecare platformă se deschide manual, una câte una | Buton „deschide toate din grupul major” |

---

## 9. Metrici de produs — unde să urmărești

- **Activation:** % conturi noi cu ≥1 item în Lista mea în 24h; % care fac „Vânătoarea de azi” în prima săptămână.
- **Time to Value:** timp de la înregistrare până la primul CANDIDAT (scor ≥80) sau prima etichetă CHILIPIR.
- **Task Completion:** rata de succes la submit pe Publică anunț / Admin creează model (probabil are drop-off — nu e instrumentat încă).
- **Error Rate:** `{error}` întors de server actions (addWatchlistItem, submitNativeOffer, updatePrefs, createModel) — sunt erori „soft”, nu ajung în Sentry by default.
- **Drop-off:** funnel Autentificare → 2FA → /cont; checkout Stripe (`checkout=success` vs `cancel` — parametrul există deja, doar netrimis ca eveniment către Analytics).
- **Feature Adoption:** % useri cu preferințe efectiv configurate (nu doar default); folosirea comparatorului (max 3) din Lista mea.
- **Retention:** `user_prefs.daily_hunt_log` deja stochează un istoric de streak — complet nefolosit vizual, deși e exact ce ar alimenta un indicator de retenție.

---

## 10. Constatări marcate

### 🔴 Critice
1. **`window.prompt()`/`window.confirm()` în Lista mea** — dialoguri native, nestilizate, fără undo, exact la acțiunile unde încrederea contează cel mai mult (preț, ștergere).
2. **Admin → Model nou/editare** — 16 câmpuri plate, fără validare client-side; a cauzat deja 2 bug-uri reale blocante într-o sesiune de testare anterioară.
3. **Perete de 15 țări** în Preferințe — încalcă Hick's Law chiar pe pagina al cărei scop e „mai puțin zgomot”.
4. **Sidebar cont/admin fără separator vizual** — linkurile de admin sunt lipite de cele de user, fără nicio demarcație (nici măcar o linie).

### 🟠 Importante
5. Nicio validare inline pe niciun formular — toate erorile apar ca un singur string generic după submit.
6. Niciun feedback de încărcare (spinner) în afară de skeleton-ul de pe `/oferte` — butoanele doar se dezactivează.
7. Iconografie emoji inconsecventă cross-platform.
8. Zero social proof, deși `/admin` calculează exact cifrele care s-ar putea afișa public (anonimizat).
9. `/cont/abonament` nu arată prețul înainte de a apăsa „Abonează-te”.
10. Fricțiune slab calibrată: ștergerea unui item din listă (ireversibilă, fără undo) e mai puțin protejată decât ștergerea contului, deși ambele sunt ireversibile.

### 🟢 Optimizări rapide (quick wins)
11. Adaugă un separator + eticheta „ADMINISTRARE” deasupra `ADMIN_LINKS` în `ContSidebar.tsx`.
12. Înlocuiește `window.confirm` la ștergere cu un pattern inline „Sigur? Șterge / Anulează” (reutilizează stilul `.confirm-added` deja existent).
13. Afișează prețul planurilor direct pe `/cont/abonament` (logica de preț Stripe există deja, copiată din `/admin`).
14. Buton „Selectează recomandate”/„Curăță” deasupra listei de țări din Preferințe.
15. Înlocuiește emoji-urile decorative cu un set mic de iconițe SVG consecvente.

### 💰 Impact mare asupra productivității
16. Afișează streak-ul deja stocat în `daily_hunt_log` ca „🔥 X zile la rând” pe `/cont` — date deja existente, doar UI nou; probabil cel mai ieftin+eficient nudge comportamental disponibil.
17. Progres „4/6 criterii” pe fiecare card din Lista mea — folosește date deja calculate (`scoreWatchlistItem`), zero muncă de backend.
18. Instrumentează `checkout=success/cancel` și erorile server actions ca evenimente Vercel Analytics — infrastructura (Analytics) e deja instalată din runda anterioară.
19. Împarte formularul „Model nou” admin în 2 pași, reutilizând pattern-ul de mașină de stări deja funcțional din `TotpPanel`.

### ⭐ Experiență premium
20. Bandă publică „342 mașini urmărite · 58 chilipiruri prinse luna asta” pe homepage/`/oferte`, sursă din interogările deja scrise pentru `/admin` — social proof fără model de date nou.
21. Widget de onboarding pe `/cont` cu progres real (1/3, 2/3) în loc de proză statică ①②③.
22. Badge „scor de încredere” per anunț, alimentat dintr-un API real de istoric VIN (dacă/când se semnează un parteneriat carVertical/autoDNA), în completarea linkului manual actual.

---

## Sinteza

Fundația e solidă: sistem de design coerent, copy uman, zero dark patterns, fricțiune corect calibrată la ștergerea contului. Cele mai mari oportunități sunt concentrate în trei zone: **Lista mea** (prea multă informație/control per card), **formularele admin lungi fără validare client-side**, și **absența totală a semnalelor de progres/social proof** — toate trei rezolvabile incremental, fără schimbări arhitecturale.
