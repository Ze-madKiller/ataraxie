-- Student accounts with a semester, and content restricted to logged-in users.
-- Run once in the Supabase SQL editor, after 0001_init.sql.

-- Semester a module belongs to (S1..S12). Null = shown to every semester.
alter table public.modules
  add column if not exists semester smallint check (semester between 1 and 12);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  semester smallint check (semester between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Create the profile at sign-up from the metadata sent by the sign-up form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_semester text := new.raw_user_meta_data ->> 'semester';
begin
  insert into public.profiles (id, full_name, semester)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    case
      when raw_semester ~ '^[0-9]{1,2}$' and raw_semester::int between 1 and 12 then raw_semester::smallint
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for accounts created before this migration (e.g. the admin).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Content is now for logged-in students only.
drop policy if exists "modules are public" on public.modules;
create policy "modules for logged-in users" on public.modules
  for select to authenticated using (true);

drop policy if exists "approved questions are public" on public.questions;
create policy "approved questions for logged-in users" on public.questions
  for select to authenticated using (status = 'approved');

drop policy if exists "choices of approved questions are public" on public.choices;
create policy "choices of approved questions for logged-in users" on public.choices
  for select to authenticated using (
    exists (select 1 from public.questions q where q.id = question_id and q.status = 'approved')
  );

drop policy if exists "anyone can report an approved question" on public.question_reports;
create policy "logged-in users can report an approved question" on public.question_reports
  for insert to authenticated with check (
    exists (select 1 from public.questions q where q.id = question_id and q.status = 'approved')
  );
