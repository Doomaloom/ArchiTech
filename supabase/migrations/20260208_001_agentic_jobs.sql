create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.app_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'queued' check (
    status in (
      'queued',
      'running',
      'fixing',
      'completed',
      'completed_with_warnings',
      'failed',
      'expired'
    )
  ),
  current_stage text not null default 'queued',
  generation_spec jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  warning_messages jsonb not null default '[]'::jsonb,
  warning_count integer not null default 0 check (warning_count >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  fix_round integer not null default 0 check (fix_round >= 0),
  max_fix_rounds integer not null default 4 check (max_fix_rounds >= 0),
  max_duration_seconds integer not null default 2700 check (max_duration_seconds > 0),
  page_task_parallelism integer not null default 4 check (page_task_parallelism between 1 and 6),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_generation_jobs_owner_created_idx
  on public.app_generation_jobs (owner_id, created_at desc);

create index if not exists app_generation_jobs_project_created_idx
  on public.app_generation_jobs (project_id, created_at desc);

create index if not exists app_generation_jobs_status_created_idx
  on public.app_generation_jobs (status, created_at desc);

create table if not exists public.app_generation_tasks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.app_generation_jobs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_type text not null check (
    task_type in (
      'orchestrate',
      'page',
      'integrate',
      'validate',
      'fix',
      'package',
      'cleanup'
    )
  ),
  task_key text not null default 'default',
  status text not null default 'queued' check (
    status in (
      'queued',
      'running',
      'succeeded',
      'failed',
      'canceled',
      'skipped'
    )
  ),
  attempt_number integer not null default 1 check (attempt_number >= 1),
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  warning_messages jsonb not null default '[]'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (job_id, task_type, task_key, attempt_number)
);

create index if not exists app_generation_tasks_job_created_idx
  on public.app_generation_tasks (job_id, created_at desc);

create index if not exists app_generation_tasks_owner_status_idx
  on public.app_generation_tasks (owner_id, status, created_at desc);

create table if not exists public.app_generation_artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.app_generation_jobs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  bucket_id text not null default 'generated-apps',
  object_path text not null,
  artifact_kind text not null default 'app-zip',
  artifact_size_bytes bigint check (artifact_size_bytes is null or artifact_size_bytes >= 0),
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (bucket_id, object_path)
);

create index if not exists app_generation_artifacts_job_created_idx
  on public.app_generation_artifacts (job_id, created_at desc);

create index if not exists app_generation_artifacts_owner_project_idx
  on public.app_generation_artifacts (owner_id, project_id, created_at desc);

create table if not exists public.app_generation_logs (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.app_generation_jobs(id) on delete cascade,
  task_id uuid references public.app_generation_tasks(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  level text not null default 'info' check (level in ('debug', 'info', 'warn', 'error')),
  stage text not null default 'orchestrator',
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_generation_logs_job_created_idx
  on public.app_generation_logs (job_id, created_at desc);

create index if not exists app_generation_logs_owner_created_idx
  on public.app_generation_logs (owner_id, created_at desc);

drop trigger if exists app_generation_jobs_set_updated_at on public.app_generation_jobs;
create trigger app_generation_jobs_set_updated_at
before update on public.app_generation_jobs
for each row
execute function public.set_updated_at();

drop trigger if exists app_generation_tasks_set_updated_at on public.app_generation_tasks;
create trigger app_generation_tasks_set_updated_at
before update on public.app_generation_tasks
for each row
execute function public.set_updated_at();

drop trigger if exists app_generation_artifacts_set_updated_at on public.app_generation_artifacts;
create trigger app_generation_artifacts_set_updated_at
before update on public.app_generation_artifacts
for each row
execute function public.set_updated_at();

alter table public.app_generation_jobs enable row level security;
alter table public.app_generation_tasks enable row level security;
alter table public.app_generation_artifacts enable row level security;
alter table public.app_generation_logs enable row level security;

drop policy if exists "app_generation_jobs_select_own" on public.app_generation_jobs;
create policy "app_generation_jobs_select_own"
on public.app_generation_jobs
for select
using (auth.uid() = owner_id);

drop policy if exists "app_generation_jobs_insert_own" on public.app_generation_jobs;
create policy "app_generation_jobs_insert_own"
on public.app_generation_jobs
for insert
with check (auth.uid() = owner_id);

drop policy if exists "app_generation_jobs_update_own" on public.app_generation_jobs;
create policy "app_generation_jobs_update_own"
on public.app_generation_jobs
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "app_generation_jobs_delete_own" on public.app_generation_jobs;
create policy "app_generation_jobs_delete_own"
on public.app_generation_jobs
for delete
using (auth.uid() = owner_id);

drop policy if exists "app_generation_tasks_select_own" on public.app_generation_tasks;
create policy "app_generation_tasks_select_own"
on public.app_generation_tasks
for select
using (auth.uid() = owner_id);

drop policy if exists "app_generation_tasks_insert_own" on public.app_generation_tasks;
create policy "app_generation_tasks_insert_own"
on public.app_generation_tasks
for insert
with check (auth.uid() = owner_id);

drop policy if exists "app_generation_tasks_update_own" on public.app_generation_tasks;
create policy "app_generation_tasks_update_own"
on public.app_generation_tasks
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "app_generation_tasks_delete_own" on public.app_generation_tasks;
create policy "app_generation_tasks_delete_own"
on public.app_generation_tasks
for delete
using (auth.uid() = owner_id);

drop policy if exists "app_generation_artifacts_select_own" on public.app_generation_artifacts;
create policy "app_generation_artifacts_select_own"
on public.app_generation_artifacts
for select
using (auth.uid() = owner_id);

drop policy if exists "app_generation_artifacts_insert_own" on public.app_generation_artifacts;
create policy "app_generation_artifacts_insert_own"
on public.app_generation_artifacts
for insert
with check (auth.uid() = owner_id);

drop policy if exists "app_generation_artifacts_update_own" on public.app_generation_artifacts;
create policy "app_generation_artifacts_update_own"
on public.app_generation_artifacts
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "app_generation_artifacts_delete_own" on public.app_generation_artifacts;
create policy "app_generation_artifacts_delete_own"
on public.app_generation_artifacts
for delete
using (auth.uid() = owner_id);

drop policy if exists "app_generation_logs_select_own" on public.app_generation_logs;
create policy "app_generation_logs_select_own"
on public.app_generation_logs
for select
using (auth.uid() = owner_id);

drop policy if exists "app_generation_logs_insert_own" on public.app_generation_logs;
create policy "app_generation_logs_insert_own"
on public.app_generation_logs
for insert
with check (auth.uid() = owner_id);

drop policy if exists "app_generation_logs_delete_own" on public.app_generation_logs;
create policy "app_generation_logs_delete_own"
on public.app_generation_logs
for delete
using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-apps',
  'generated-apps',
  false,
  367001600,
  array['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_generated_apps_select" on storage.objects;
create policy "storage_generated_apps_select"
on storage.objects
for select
using (
  bucket_id = 'generated-apps'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_generated_apps_insert" on storage.objects;
create policy "storage_generated_apps_insert"
on storage.objects
for insert
with check (
  bucket_id = 'generated-apps'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_generated_apps_update" on storage.objects;
create policy "storage_generated_apps_update"
on storage.objects
for update
using (
  bucket_id = 'generated-apps'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'generated-apps'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_generated_apps_delete" on storage.objects;
create policy "storage_generated_apps_delete"
on storage.objects
for delete
using (
  bucket_id = 'generated-apps'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
