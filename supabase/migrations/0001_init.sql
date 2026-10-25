-- Ataraxie schema. Run once in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Uploaded PDFs. kind: exam = past exam paper, cours = professor's lesson, corrige = answer key.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  kind text not null check (kind in ('exam', 'cours', 'corrige')),
  title text not null,
  storage_path text not null,
  page_count int,
  anthropic_file_id text,
  exam_year int,
  exam_session text,
  created_at timestamptz not null default now()
);
create index on public.documents (module_id, kind);

-- One job per exam PDF. The exam is split into page chunks; each /step call processes one chunk.
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  exam_document_id uuid not null references public.documents(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'error')),
  chunks jsonb not null default '[]'::jsonb,
  done_chunks int not null default 0,
  questions_created int not null default 0,
  error text,
  -- Lease taken while a chunk is being processed, so a retried request cannot process it twice.
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.import_jobs (module_id);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  exam_document_id uuid references public.documents(id) on delete set null,
  exam_year int,
  exam_session text,
  number int,
  statement text not null,
  explanation text,
  lesson_excerpt text,
  lesson_document_id uuid references public.documents(id) on delete set null,
  lesson_title text,
  lesson_page int,
  source_page int,
  answer_source text check (answer_source in ('corrige', 'exam', 'ai', 'manual')),
  ai_confidence text check (ai_confidence in ('high', 'medium', 'low')),
  ai_notes text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.questions (module_id, status);

create table public.choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  text text not null,
  is_correct boolean not null default false,
  position int not null default 0
);
create index on public.choices (question_id);

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Users listed here can use /admin. Add yourself after signing up:
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Row level security: the public site reads with the anon key and only sees approved content.
-- Admin writes go through server code using the service role key, which bypasses RLS.
alter table public.modules enable row level security;
alter table public.documents enable row level security;
alter table public.import_jobs enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.question_reports enable row level security;
alter table public.admins enable row level security;

create policy "modules are public" on public.modules
  for select using (true);

create policy "approved questions are public" on public.questions
  for select using (status = 'approved');

create policy "choices of approved questions are public" on public.choices
  for select using (
    exists (select 1 from public.questions q where q.id = question_id and q.status = 'approved')
  );

create policy "anyone can report an approved question" on public.question_reports
  for insert with check (
    exists (select 1 from public.questions q where q.id = question_id and q.status = 'approved')
  );

-- Private bucket for the uploaded PDFs.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
