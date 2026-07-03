# Vânătorul MB — platforma v2.0 (SaaS)

Platformă pentru pasionații de Mercedes-Benz clasice: modele-țintă cu potențial de investiție, oferte agregate din Europa, evaluare de preț pe grade de stare, alerte de oferte excelente, ghid de achiziție și înmatriculare în România.

## Conținutul acestui repo (punct de pornire)
- `docs/caiet-de-sarcini.md` — specificația completă (arhitectură, cerințe, milestone-uri M0–M5)
- `reference/vanatorul-mercedes-v5.html` — aplicația v5 funcțională (sursa de adevăr pt. design, texte, scoring)
- `supabase/migrations/0001_schema.sql` — schema DB completă cu Row Level Security
- `supabase/seed.sql` — datele inițiale (6 modele, 16 platforme, costuri transport)
- `design/tokens.css` — design system „Datenkarte"
- `CLAUDE.md` — instrucțiuni de lucru pentru Claude Code

## Pornire rapidă (dezvoltare)
1. Cerințe: Node.js 20+, Git, Docker, Supabase CLI (`npm i -g supabase`).
2. `supabase init && supabase start` — pornește Postgres local.
3. `supabase db reset` — aplică migrarea + seed-ul.
4. Deschide folderul în Claude Code și spune: **„Citește CLAUDE.md și continuă M0."**
5. Conturi necesare pe parcurs (gratuite la început): Supabase, Vercel, Resend, Stripe (test mode), GitHub.

## Variabile de mediu
Copiază `.env.example` în `.env.local` și completează valorile. Nu comite niciodată `.env*` cu valori reale.

## Milestone-uri
M0 Fundația → M1 Conturi + 2FA + portare v5 → M2 Motorul de oferte → M3 Alerte email → M4 Monetizare → M5 Lansare. Detalii și criterii de acceptare în caietul de sarcini, secțiunea 9.
