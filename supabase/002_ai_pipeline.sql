-- AI pipeline tables: master resumes and per-job AI results.
-- Depends on: 001_create_jobs.sql (set_updated_at function, jobs table)

create table if not exists public.resumes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null default 'My Resume',
  content_md  text        not null default '',
  is_default  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists resumes_user_idx on public.resumes (user_id, created_at desc);

alter table public.resumes enable row level security;

create policy "Users can read their own resumes"
  on public.resumes for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own resumes"
  on public.resumes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own resumes"
  on public.resumes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own resumes"
  on public.resumes for delete to authenticated
  using (auth.uid() = user_id);

drop trigger if exists set_resumes_updated_at on public.resumes;
create trigger set_resumes_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;

-- ---------------------------------------------------------------------------

create table if not exists public.job_ai_results (
  id                  uuid        primary key default gen_random_uuid(),
  job_id              uuid        not null references public.jobs(id) on delete cascade,
  user_id             uuid        not null references auth.users(id) on delete cascade,
  resume_id           uuid        references public.resumes(id) on delete set null,
  ats_score           integer     check (ats_score between 0 and 100),
  keyword_gaps        text[],
  ats_summary         text,
  tailored_resume_md  text,
  questions           jsonb,
  pipeline_status     text        not null default 'pending'
                                  check (pipeline_status in ('pending', 'processing', 'complete', 'error')),
  error_message       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- One result per (job, resume) pair; nulls handled by partial index
create unique index if not exists job_ai_results_job_resume_idx
  on public.job_ai_results (job_id, resume_id)
  where resume_id is not null;

create unique index if not exists job_ai_results_job_null_resume_idx
  on public.job_ai_results (job_id)
  where resume_id is null;

create index if not exists job_ai_results_user_idx
  on public.job_ai_results (user_id, created_at desc);

alter table public.job_ai_results enable row level security;

create policy "Users can read their own ai results"
  on public.job_ai_results for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own ai results"
  on public.job_ai_results for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own ai results"
  on public.job_ai_results for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own ai results"
  on public.job_ai_results for delete to authenticated
  using (auth.uid() = user_id);

drop trigger if exists set_job_ai_results_updated_at on public.job_ai_results;
create trigger set_job_ai_results_updated_at
  before update on public.job_ai_results
  for each row execute function public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_ai_results TO authenticated;
