-- Digital Paithini — Supabase Database & Storage Setup
-- Run this script once in Supabase Dashboard -> SQL Editor (or apply as migration).

-- 1. Enable UUID extension if needed
create extension if not exists pgcrypto;

-- 2. Shared items table (folders and files in one unified hierarchy)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  type text not null check (type in ('folder', 'file')),
  parent_id uuid references public.items(id) on delete cascade,
  storage_path text,
  file_url text,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_file_storage_check check (
    (type = 'folder' and storage_path is null)
    or (type = 'file' and storage_path is not null)
  )
);

-- Indexes for fast folder listing, search, and recent files
create index if not exists idx_items_parent_id on public.items(parent_id);
create index if not exists idx_items_type_updated_at on public.items(type, updated_at desc);
create index if not exists idx_items_name_lower on public.items(lower(name));
create index if not exists idx_items_created_by on public.items(created_by);

-- 3. Auto-update updated_at timestamp (fixed search_path for security)
create or replace function public.handle_items_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at
before update on public.items
for each row
execute function public.handle_items_updated_at();

-- 4. Row Level Security (private: authenticated members only, equal permissions)
revoke all on table public.items from anon;
grant select, insert, update, delete on table public.items to authenticated;

alter table public.items enable row level security;

drop policy if exists "Authenticated members can read all shared items" on public.items;
create policy "Authenticated members can read all shared items"
on public.items
for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Authenticated members can create shared items" on public.items;
create policy "Authenticated members can create shared items"
on public.items
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated members can update all shared items" on public.items;
create policy "Authenticated members can update all shared items"
on public.items
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated members can delete all shared items" on public.items;
create policy "Authenticated members can delete all shared items"
on public.items
for delete
to authenticated
using ((select auth.uid()) is not null);

-- 5. Enable Realtime updates for public.items
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;
end
$$;

-- 6. Private shared storage bucket
insert into storage.buckets (id, name, public)
values ('digital-paithini-files', 'digital-paithini-files', false)
on conflict (id) do update set public = false;

-- Storage policies: only authenticated members can read, upload, update, delete
drop policy if exists "Authenticated members can view shared files" on storage.objects;
create policy "Authenticated members can view shared files"
on storage.objects
for select
to authenticated
using (bucket_id = 'digital-paithini-files' and (select auth.uid()) is not null);

drop policy if exists "Authenticated members can upload shared files" on storage.objects;
create policy "Authenticated members can upload shared files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'digital-paithini-files' and (select auth.uid()) is not null);

drop policy if exists "Authenticated members can update shared files" on storage.objects;
create policy "Authenticated members can update shared files"
on storage.objects
for update
to authenticated
using (bucket_id = 'digital-paithini-files' and (select auth.uid()) is not null)
with check (bucket_id = 'digital-paithini-files' and (select auth.uid()) is not null);

drop policy if exists "Authenticated members can delete shared files" on storage.objects;
create policy "Authenticated members can delete shared files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'digital-paithini-files' and (select auth.uid()) is not null);

-- 7. Seed suggested initial folders (only when table is empty so deletions/renames stick)
insert into public.items (name, type, parent_id)
select folder_name, 'folder', null
from (
  values
    ('Minutes'),
    ('Reports'),
    ('Members List'),
    ('Books'),
    ('Sahithyotsav')
) as seed(folder_name)
where not exists (select 1 from public.items);
