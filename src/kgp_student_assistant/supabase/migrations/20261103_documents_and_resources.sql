-- DucKGP: private documents + moderated shared resources
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  filename text not null,
  storage_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  created_at timestamptz not null default now(),
  constraint document_owned_path check (split_part(storage_path, '/', 1) = owner_id::text)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  author_name text not null check (length(btrim(author_name)) between 1 and 150),
  course_code text not null default '',
  description text not null default '',
  filename text not null,
  storage_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint resource_owned_path check (split_part(storage_path, '/', 1) = uploader_id::text)
);

create index documents_owner_idx on public.documents(owner_id, created_at desc);
create index resources_status_idx on public.resources(status, created_at desc);
create index resources_uploader_idx on public.resources(uploader_id);

alter table public.documents enable row level security;
alter table public.resources enable row level security;
revoke all on public.documents, public.resources from anon, authenticated;
grant select, insert, delete on public.documents, public.resources to authenticated;

create policy "documents_read" on public.documents for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "documents_insert" on public.documents for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "documents_delete" on public.documents for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "resources_read" on public.resources for select to authenticated
  using (status = 'approved' or uploader_id = (select auth.uid()));
create policy "resources_insert" on public.resources for insert to authenticated
  with check (uploader_id = (select auth.uid()) and status = 'pending');
create policy "resources_delete" on public.resources for delete to authenticated
  using (uploader_id = (select auth.uid()));

-- Private storage buckets (20 MB maximum per upload)
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('personal-documents', 'personal-documents', false, 20971520),
  ('shared-resources', 'shared-resources', false, 20971520)
on conflict (id) do nothing;

-- Each student's uploaded path starts with their own auth UUID.
create policy "personal_upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'personal-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  );
create policy "personal_read" on storage.objects for select to authenticated
  using (bucket_id = 'personal-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "personal_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'personal-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "shared_upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shared-resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  );
create policy "shared_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'shared-resources'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.resources r
                 where r.storage_path = name and r.status = 'approved')
    )
  );
create policy "shared_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'shared-resources'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
