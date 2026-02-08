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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Project',
  description text default '',
  is_archived boolean not null default false,
  latest_snapshot jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null,
  source text not null default 'manual',
  summary text,
  snapshot_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, version_number)
);

create index if not exists project_versions_project_created_idx
  on public.project_versions (project_id, created_at desc);

create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null default 'project-assets',
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (bucket_id, object_path)
);

create index if not exists project_assets_project_created_idx
  on public.project_assets (project_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.project_assets enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
on public.projects
for select
using (auth.uid() = owner_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects
for insert
with check (auth.uid() = owner_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
on public.projects
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
on public.projects
for delete
using (auth.uid() = owner_id);

drop policy if exists "project_versions_select_own" on public.project_versions;
create policy "project_versions_select_own"
on public.project_versions
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_versions.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_versions_insert_own" on public.project_versions;
create policy "project_versions_insert_own"
on public.project_versions
for insert
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_versions.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists "project_assets_select_own" on public.project_assets;
create policy "project_assets_select_own"
on public.project_assets
for select
using (auth.uid() = owner_id);

drop policy if exists "project_assets_insert_own" on public.project_assets;
create policy "project_assets_insert_own"
on public.project_assets
for insert
with check (auth.uid() = owner_id);

drop policy if exists "project_assets_update_own" on public.project_assets;
create policy "project_assets_update_own"
on public.project_assets
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "project_assets_delete_own" on public.project_assets;
create policy "project_assets_delete_own"
on public.project_assets
for delete
using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-assets', 'project-assets', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "storage_project_assets_select" on storage.objects;
create policy "storage_project_assets_select"
on storage.objects
for select
using (
  bucket_id = 'project-assets'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_project_assets_insert" on storage.objects;
create policy "storage_project_assets_insert"
on storage.objects
for insert
with check (
  bucket_id = 'project-assets'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_project_assets_update" on storage.objects;
create policy "storage_project_assets_update"
on storage.objects
for update
using (
  bucket_id = 'project-assets'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-assets'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_project_assets_delete" on storage.objects;
create policy "storage_project_assets_delete"
on storage.objects
for delete
using (
  bucket_id = 'project-assets'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
