-- Sursă de date reală pentru Trend-Scout: fragmente de discuții găsite prin
-- căutare web legitimă (nu scraping sistematic de forumuri — vezi regula
-- legală din rutina Claude programată, Faza C). Doar text + dată + sursă,
-- nicio dată personală — scriere exclusiv prin clientul admin (service_role),
-- la fel ca agent_report_drafts.
create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  post_date date not null,
  source text,
  source_url text,
  ingested_at timestamptz not null default now()
);
create index idx_forum_posts_date on public.forum_posts (post_date);

alter table public.forum_posts enable row level security;

create policy "forum_posts_admin_read" on public.forum_posts
  for select using (public.is_admin());
