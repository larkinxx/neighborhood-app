-- ============================================================================
-- Модерация постов (жалобы) + бейдж «подтверждённый житель» + простая
-- админ-панель без service_role — доступ определяется email в JWT.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Новые статусы поста: под жалобой и забаненный админом
-- ----------------------------------------------------------------------------

alter type public.post_status add value if not exists 'under_review';
alter type public.post_status add value if not exists 'banned';

-- ----------------------------------------------------------------------------
-- reports.reason — теперь необязателен: кнопка «Пожаловаться» не спрашивает
-- причину, жалоба создаётся одним кликом
-- ----------------------------------------------------------------------------

alter table public.reports alter column reason drop not null;

-- ----------------------------------------------------------------------------
-- Жалоба автоматически переводит пост «на проверке» и скрывает его из
-- ленты у всех, кроме автора (RLS на posts уже показывает не-активные
-- посты только автору). SECURITY DEFINER — по той же схеме, что и
-- handle_new_user: обычный пользователь не имеет права менять чужой пост
-- (policy "posts: update own"), но эта функция выполняется от имени
-- владельца таблицы и обходит это ограничение только для одного узкого
-- перехода статуса.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_report()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.posts
  set status = 'under_review'
  where id = new.post_id
    and status = 'active';
  return new;
end;
$$;

create trigger on_report_created
after insert on public.reports
for each row execute function public.handle_new_report();

-- ----------------------------------------------------------------------------
-- Админ-доступ по email — без service_role key. Один захардкоженный адрес
-- в RLS-политиках; проверка дублируется на уровне страницы /admin для UX,
-- но именно эти политики — реальная граница безопасности.
-- ----------------------------------------------------------------------------

create policy "posts: admin select all"
on public.posts for select
using ((auth.jwt() ->> 'email') = 'denisatepin45@gmail.com');

create policy "posts: admin update status"
on public.posts for update
using ((auth.jwt() ->> 'email') = 'denisatepin45@gmail.com')
with check ((auth.jwt() ->> 'email') = 'denisatepin45@gmail.com');

create policy "reports: admin select all"
on public.reports for select
using ((auth.jwt() ->> 'email') = 'denisatepin45@gmail.com');

-- ----------------------------------------------------------------------------
-- Бейдж «подтверждённый житель»: users.is_verified уже существовал в схеме
-- с самого начала (заложен заранее) — не хватало только пути к загруженному
-- скриншоту и защиты от того, что пользователь сам выставит себе is_verified.
-- ----------------------------------------------------------------------------

alter table public.users add column verification_photo_path text;

comment on column public.users.verification_photo_path is
  'Путь к файлу в storage-бакете verification-photos (скриншот квитанции), null = не отправлено. is_verified=false + путь не null = на проверке.';

create or replace function public.guard_is_verified()
returns trigger
language plpgsql
as $$
begin
  -- Ставить is_verified = true может только админ (по email из JWT) —
  -- иначе пользователь мог бы подтвердить сам себя обычным update-запросом,
  -- ведь RLS "users: update own" разрешает менять свою строку целиком.
  if new.is_verified = true
     and old.is_verified is distinct from new.is_verified
     and coalesce(auth.jwt() ->> 'email', '') <> 'denisatepin45@gmail.com' then
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;

create trigger users_guard_is_verified
before update on public.users
for each row execute function public.guard_is_verified();

-- ----------------------------------------------------------------------------
-- Публичное «безопасное» представление users — только id + is_verified,
-- чтобы показывать бейдж рядом с постами без открытия email/координат дома
-- через RLS. Владелец view (тот же, что владеет таблицей) обходит RLS
-- базовой таблицы, поэтому view отдаёт is_verified для всех строк, но
-- сам view физически не содержит остальных колонок.
-- ----------------------------------------------------------------------------

create view public.public_profiles as
select id, is_verified
from public.users;

grant select on public.public_profiles to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Storage: приватный бакет для скриншотов квитанций
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('verification-photos', 'verification-photos', false)
on conflict (id) do nothing;

create policy "verification-photos: insert own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'verification-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "verification-photos: select own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'verification-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "verification-photos: admin select all"
on storage.objects for select
to authenticated
using (
  bucket_id = 'verification-photos'
  and (auth.jwt() ->> 'email') = 'denisatepin45@gmail.com'
);
