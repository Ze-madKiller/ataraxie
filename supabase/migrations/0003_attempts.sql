-- Every answer given by a student, and the functions behind the admin statistics page.
-- Run once in the Supabase SQL editor, after 0002_accounts.sql.

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  -- Ids of the choices the student ticked.
  selected uuid[] not null default '{}',
  correct boolean not null,
  mode text not null default 'practice' check (mode in ('practice', 'exam')),
  created_at timestamptz not null default now()
);

create index if not exists attempts_module_created_idx on public.attempts (module_id, created_at);
create index if not exists attempts_question_idx on public.attempts (question_id);
create index if not exists attempts_user_created_idx on public.attempts (user_id, created_at);

alter table public.attempts enable row level security;

drop policy if exists "insert own attempts" on public.attempts;
create policy "insert own attempts" on public.attempts
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.questions q
      where q.id = question_id and q.module_id = attempts.module_id and q.status = 'approved'
    )
  );

drop policy if exists "read own attempts" on public.attempts;
create policy "read own attempts" on public.attempts
  for select to authenticated using (auth.uid() = user_id);

-- First answer of each student to each question. Retries would inflate success rates.
create or replace view public.first_attempts
with (security_invoker = true) as
select distinct on (user_id, question_id) *
from public.attempts
order by user_id, question_id, created_at;

-- Statistics functions. Called by the admin page with the service role key only.

create or replace function public.admin_overview(since timestamptz)
returns json
language sql
stable
set search_path = ''
as $$
  select json_build_object(
    'students_total', (select count(*) from public.profiles p where not exists (select 1 from public.admins a where a.user_id = p.id)),
    'students_new', (select count(*) from public.profiles p where p.created_at >= since and not exists (select 1 from public.admins a where a.user_id = p.id)),
    'active_students', (select count(distinct user_id) from public.attempts where created_at >= since),
    'answers', (select count(*) from public.attempts where created_at >= since),
    'first_answers', (select count(*) from public.first_attempts where created_at >= since),
    'first_correct', (select count(*) from public.first_attempts where created_at >= since and correct),
    'questions_approved', (select count(*) from public.questions where status = 'approved'),
    'questions_draft', (select count(*) from public.questions where status = 'draft'),
    'open_reports', (select count(*) from public.question_reports where not resolved),
    'first_attempt_at', (select min(created_at) from public.attempts)
  );
$$;

create or replace function public.admin_daily_activity(since timestamptz)
returns table (day date, answers bigint, correct bigint, students bigint)
language sql
stable
set search_path = ''
as $$
  select (created_at at time zone 'UTC')::date as day,
         count(*), count(*) filter (where correct), count(distinct user_id)
  from public.attempts
  where created_at >= since
  group by 1
  order by 1;
$$;

create or replace function public.admin_students_by_semester()
returns table (semester smallint, students bigint)
language sql
stable
set search_path = ''
as $$
  select p.semester, count(*)
  from public.profiles p
  where not exists (select 1 from public.admins a where a.user_id = p.id)
  group by p.semester
  order by p.semester nulls last;
$$;

create or replace function public.admin_module_stats(since timestamptz, sem smallint)
returns table (
  module_id uuid, name text, semester smallint, questions bigint,
  students bigint, answers bigint, first_answers bigint, first_correct bigint, questions_seen bigint
)
language sql
stable
set search_path = ''
as $$
  select m.id, m.name, m.semester,
    (select count(*) from public.questions q where q.module_id = m.id and q.status = 'approved'),
    (select count(distinct a.user_id) from public.attempts a where a.module_id = m.id and a.created_at >= since),
    (select count(*) from public.attempts a where a.module_id = m.id and a.created_at >= since),
    (select count(*) from public.first_attempts f where f.module_id = m.id and f.created_at >= since),
    (select count(*) from public.first_attempts f where f.module_id = m.id and f.created_at >= since and f.correct),
    (select count(distinct a.question_id) from public.attempts a where a.module_id = m.id and a.created_at >= since)
  from public.modules m
  where sem is null or m.semester = sem
  order by m.semester nulls first, m.position;
$$;

create or replace function public.admin_question_stats(since timestamptz, sem smallint, min_answers int)
returns table (
  question_id uuid, module_name text, statement text, exam_year int, exam_session text, question_number int,
  answers bigint, correct bigint, open_reports bigint
)
language sql
stable
set search_path = ''
as $$
  select q.id, m.name, q.statement, q.exam_year, q.exam_session, q.number,
    count(f.id), count(f.id) filter (where f.correct),
    (select count(*) from public.question_reports r where r.question_id = q.id and not r.resolved)
  from public.questions q
  join public.modules m on m.id = q.module_id
  left join public.first_attempts f on f.question_id = q.id and f.created_at >= since
  where q.status = 'approved' and (sem is null or m.semester = sem)
  group by q.id, m.name
  having count(f.id) >= min_answers
     or (select count(*) from public.question_reports r where r.question_id = q.id and not r.resolved) > 0;
$$;

create or replace function public.admin_choice_distribution(question_ids uuid[], since timestamptz)
returns table (question_id uuid, choice_id uuid, label text, choice_text text, is_correct boolean, choice_position int, picks bigint)
language sql
stable
set search_path = ''
as $$
  select c.question_id, c.id, c.label, c.text, c.is_correct, c.position,
    (select count(*) from public.first_attempts f
      where f.question_id = c.question_id and f.created_at >= since and c.id = any (f.selected))
  from public.choices c
  where c.question_id = any (question_ids)
  order by c.question_id, c.position;
$$;

-- Only the service role (admin server code) may call the statistics functions.
revoke execute on function public.admin_overview(timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_daily_activity(timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_students_by_semester() from public, anon, authenticated;
revoke execute on function public.admin_module_stats(timestamptz, smallint) from public, anon, authenticated;
revoke execute on function public.admin_question_stats(timestamptz, smallint, int) from public, anon, authenticated;
revoke execute on function public.admin_choice_distribution(uuid[], timestamptz) from public, anon, authenticated;

-- Make the API see the new functions right away.
notify pgrst, 'reload schema';
