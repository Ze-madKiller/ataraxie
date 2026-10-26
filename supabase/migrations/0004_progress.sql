-- Progress tied to the account, so it follows the student on every device.
-- Run once in the Supabase SQL editor, after 0003_attempts.sql.
-- Progress = the latest answer to each question (from public.attempts) after the last reset.

-- "Réinitialiser" on a module: answers before reset_at no longer count as progress.
-- The answers themselves are kept for the admin statistics.
create table if not exists public.progress_resets (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  reset_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

alter table public.progress_resets enable row level security;

drop policy if exists "read own resets" on public.progress_resets;
create policy "read own resets" on public.progress_resets
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "insert own resets" on public.progress_resets;
create policy "insert own resets" on public.progress_resets
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update own resets" on public.progress_resets;
create policy "update own resets" on public.progress_resets
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Progress that was only stored in a browser before answers were saved in the database.
-- Kept apart from public.attempts: it cannot be verified, so it never counts in the statistics.
create table if not exists public.imported_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  correct boolean not null,
  answered_at timestamptz not null,
  primary key (user_id, question_id)
);

alter table public.imported_progress enable row level security;

drop policy if exists "read own imported progress" on public.imported_progress;
create policy "read own imported progress" on public.imported_progress
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "insert own imported progress" on public.imported_progress;
create policy "insert own imported progress" on public.imported_progress
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.questions q
      where q.id = question_id and q.module_id = imported_progress.module_id and q.status = 'approved'
    )
  );

notify pgrst, 'reload schema';
