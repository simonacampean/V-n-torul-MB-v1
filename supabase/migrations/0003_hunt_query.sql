-- ============================================================
-- VÂNĂTORUL MB v2.0 — Migrarea 0003: query de căutare per model (M1, F-02)
-- v5 folosește un termen scurt de căutare distinct de gallery_query (ex. W124
-- ⇒ "W124", R129 ⇒ "SL R129") pentru a compune linkurile către platforme
-- (url_template conține deja {query}/{querySlug}/{yearFrom}/{yearTo}).
-- ============================================================

alter table public.target_models add column if not exists hunt_query text;

update public.target_models set hunt_query = 'W124' where code = 'W124';
update public.target_models set hunt_query = 'SL R129' where code = 'R129';
update public.target_models set hunt_query = '190E W201' where code = 'W201';
update public.target_models set hunt_query = 'W126' where code = 'W126';
update public.target_models set hunt_query = 'W123' where code = 'W123';
update public.target_models set hunt_query = 'W140' where code = 'W140';

alter table public.target_models alter column hunt_query set not null;
