-- Public module pages: admins pick a few approved questions per module to show, with their
-- correction, to visitors who are not logged in (search engines included).
-- Run once in the Supabase SQL editor, after 0004_progress.sql.
-- No new RLS policy: the public pages read through server code with the service role key and
-- select only sample questions, so the rest of the question bank stays behind login.

alter table public.questions
  add column if not exists is_sample boolean not null default false;

create index if not exists questions_module_sample_idx
  on public.questions (module_id)
  where is_sample and status = 'approved';
