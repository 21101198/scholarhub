create table public.paper_files (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references public.papers on delete cascade not null,
  name text not null,
  url text not null,
  size bigint,
  file_type text,
  created_at timestamptz default now()
);

alter table public.paper_files enable row level security;
create policy "files_select" on public.paper_files for select using (true);
create policy "files_insert" on public.paper_files for insert with check (
  auth.uid() = (select user_id from public.papers where id = paper_id)
);
create policy "files_delete" on public.paper_files for delete using (
  auth.uid() = (select user_id from public.papers where id = paper_id)
);