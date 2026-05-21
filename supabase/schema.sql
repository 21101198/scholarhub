-- ============================================================
-- ScholarHub Database Schema
-- Supabase SQL Editor 에 이 코드를 붙여넣기 하고 실행하세요
-- ============================================================

-- 1. 사용자 프로필 (Supabase Auth 와 연동)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  institution text,
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. 논문 / 연구 아이디어
create table public.papers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  type text not null check (type in ('Research Paper', 'Research Idea', 'Work in Progress')),
  title text not null,
  abstract text not null,
  tags text[] default '{}',
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. 수식 (논문당 여러 개)
create table public.equations (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references public.papers on delete cascade not null,
  label text not null,
  equation text not null,
  order_index integer default 0
);

-- 4. 버전 히스토리
create table public.versions (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references public.papers on delete cascade not null,
  version_tag text not null,
  note text not null,
  created_at timestamptz default now()
);

-- 5. 피드백 & 댓글
create table public.feedbacks (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references public.papers on delete cascade not null,
  user_id uuid references public.profiles on delete cascade,
  author_name text,       -- AI 리뷰나 비로그인 표시용
  content text not null,
  is_ai boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS) — 권한 제어
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.papers    enable row level security;
alter table public.equations enable row level security;
alter table public.versions  enable row level security;
alter table public.feedbacks enable row level security;

-- profiles: 누구나 읽기, 본인만 수정
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- papers: 누구나 published 글 읽기, 본인만 CRUD
create policy "papers_select" on public.papers for select using (is_published = true or auth.uid() = user_id);
create policy "papers_insert" on public.papers for insert with check (auth.uid() = user_id);
create policy "papers_update" on public.papers for update using (auth.uid() = user_id);
create policy "papers_delete" on public.papers for delete using (auth.uid() = user_id);

-- equations: papers 와 동일
create policy "equations_select" on public.equations for select using (true);
create policy "equations_insert" on public.equations for insert with check (
  auth.uid() = (select user_id from public.papers where id = paper_id)
);
create policy "equations_delete" on public.equations for delete using (
  auth.uid() = (select user_id from public.papers where id = paper_id)
);

-- versions: 모두 읽기, 논문 소유자만 추가
create policy "versions_select" on public.versions for select using (true);
create policy "versions_insert" on public.versions for insert with check (
  auth.uid() = (select user_id from public.papers where id = paper_id)
);

-- feedbacks: 모두 읽기, 로그인 사용자 작성
create policy "feedbacks_select" on public.feedbacks for select using (true);
create policy "feedbacks_insert" on public.feedbacks for insert with check (
  auth.uid() is not null or is_ai = true
);
create policy "feedbacks_delete" on public.feedbacks for delete using (
  auth.uid() = user_id
);

-- ============================================================
-- 자동으로 updated_at 갱신하는 트리거
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger papers_updated_at
  before update on public.papers
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 신규 가입 시 profiles 자동 생성
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
