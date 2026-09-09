-- ============================================================================
-- Neighborhood platform: базовая схема (users, posts, reports) + RLS
-- ============================================================================

-- Расширения для расчёта расстояний по lat/lng без PostGIS
-- (в Supabase схема "extensions" уже существует; create schema if not exists
-- делает миграцию воспроизводимой и на голом Postgres)
create schema if not exists extensions;
create extension if not exists cube with schema extensions;
create extension if not exists earthdistance with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type public.post_type as enum ('announcement', 'found', 'service', 'emergency');
comment on type public.post_type is
  'announcement = объявление, found = находка, service = услуга, emergency = чп';

create type public.post_status as enum ('pending', 'active', 'hidden');

-- ----------------------------------------------------------------------------
-- users — расширение auth.users
-- ----------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_verified boolean not null default false,
  home_complex text,
  -- координаты дома нужны, чтобы считать радиус видимости ленты;
  -- в исходном запросе явно не упомянуты, но без них "радиус своего дома" не работает
  home_lat double precision,
  home_lng double precision,
  radius_m integer not null default 800 check (radius_m > 0 and radius_m <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_coords_both_or_none check (
    (home_lat is null and home_lng is null) or (home_lat is not null and home_lng is not null)
  ),
  constraint home_lat_range check (home_lat is null or home_lat between -90 and 90),
  constraint home_lng_range check (home_lng is null or home_lng between -180 and 180)
);

comment on table public.users is 'Профиль пользователя, 1:1 с auth.users';

-- ----------------------------------------------------------------------------
-- posts
-- ----------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users (id) on delete cascade,
  type public.post_type not null,
  text text not null check (char_length(text) between 1 and 2000),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  status public.post_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_author_id_idx on public.posts (author_id);
create index posts_status_idx on public.posts (status);
-- функциональный GiST-индекс для быстрого поиска по радиусу
create index posts_earth_gix on public.posts using gist (extensions.ll_to_earth(lat, lng));

-- ----------------------------------------------------------------------------
-- reports
-- ----------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, post_id) -- один юзер — одна жалоба на пост
);

create index reports_post_id_idx on public.reports (post_id);

-- ----------------------------------------------------------------------------
-- updated_at триггер
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Автосоздание строки в public.users при регистрации
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.reports enable row level security;

-- users: видит и правит только свой профиль
create policy "users: select own"
on public.users for select
using (id = auth.uid());

create policy "users: update own"
on public.users for update
using (id = auth.uid())
with check (id = auth.uid());

-- posts: свои посты — всегда; чужие — только active и в радиусе своего дома
create policy "posts: select own or within radius"
on public.posts for select
using (
  author_id = auth.uid()
  or (
    status = 'active'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.home_lat is not null
        and u.home_lng is not null
        and extensions.earth_distance(
              extensions.ll_to_earth(u.home_lat, u.home_lng),
              extensions.ll_to_earth(public.posts.lat, public.posts.lng)
            ) <= u.radius_m
    )
  )
);

create policy "posts: insert own"
on public.posts for insert
with check (author_id = auth.uid());

create policy "posts: update own"
on public.posts for update
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "posts: delete own"
on public.posts for delete
using (author_id = auth.uid());

-- reports: пользователь создаёт и видит только свои жалобы
create policy "reports: select own"
on public.reports for select
using (reporter_id = auth.uid());

create policy "reports: insert own"
on public.reports for insert
with check (reporter_id = auth.uid());

-- Примечание: у reports нет policy на update/delete — по умолчанию RLS
-- запрещает всё, что явно не разрешено политикой, так что изменить или
-- удалить жалобу через обычный (anon/authenticated) ключ нельзя ни у кого.
-- Админ-панель модерации должна ходить через service_role key — он
-- игнорирует RLS целиком, отдельные policy для "модератора" не нужны,
-- пока в проекте нет отдельной роли модератора.
