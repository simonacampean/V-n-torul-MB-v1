# M0 — Stadiu (03.07.2026, după unificare)

Versiunea oficială = codul Claude Code (publicat pe staging) + corecțiile din chat:
1. **Fonturi prin next/font** (layout.tsx) în loc de @import Google Fonts — corecția pentru Lighthouse mobile ≥ 90.
2. **seed.sql reparat** (ghilimeaua din „de fițe” — eroarea JSON de la primul import în Supabase).
3. setup-m0.sh eliminat (traseul Docker/local abandonat — Supabase Cloud e mediul de dezvoltare și staging).

## Criterii M0
- [x] Schema + seed în Supabase Cloud — 6 modele / 16 platforme confirmate prin SQL
- [x] Aplicația conectată la DB (local prin .env.local; staging prin Environment Variables pe Vercel)
- [x] Staging live: https://vanatorul-mb.vercel.app
- [x] Teste (11/11), typecheck, lint, build — verzi
- [ ] Lighthouse mobile ≥ 90 — de re-măsurat după publicarea acestei versiuni (măsurătoarea anterioară: 89, cu fonturile pe @import)

## Notă de proces
Versiunile paralele (chat vs Claude Code) au fost unificate în acest cod. De acum:
o singură copie de lucru; Claude Code se rulează doar deliberat, cu instrucțiuni explicite.
