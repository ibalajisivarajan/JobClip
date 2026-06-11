-- JobClip V1 jobs table and row-level security policies.
create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text,
  role_title text,
  job_description text,
  location text,
  remote_hybrid text,
  employment_type text,
  posted_date text,
  salary text,
  visa_sponsorship_clue text,
  source_url text,
  source_platform text,
  raw_text text,
  capture_method text not null default 'chrome_extension' check (capture_method in ('chrome_extension', 'manual_url', 'manual_text')),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_created_idx on public.jobs (user_id, created_at desc);

alter table public.jobs
  add column if not exists capture_method text not null default 'chrome_extension';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_capture_method_check'
  ) then
    alter table public.jobs
      add constraint jobs_capture_method_check
      check (capture_method in ('chrome_extension', 'manual_url', 'manual_text'));
  end if;
end $$;

alter table public.jobs enable row level security;

create policy "Users can read their own jobs"
  on public.jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own jobs"
  on public.jobs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own jobs"
  on public.jobs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own jobs"
  on public.jobs
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
  before update on public.jobs
  for each row
  execute function public.set_updated_at();
