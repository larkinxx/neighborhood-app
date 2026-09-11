-- ============================================================================
-- Просмотр ленты без регистрации: анонимный доступ к постам, отфильтрованным
-- по району (переиспользуем public.districts вместо радиуса — у гостя нет
-- точки дома, чтобы считать earth_distance).
-- ============================================================================

alter table public.posts
  add column district_id uuid references public.districts (id);

comment on column public.posts.district_id is
  'Район поста (point-in-polygon по public/moscow-districts.geojson, считается при создании поста) — используется для анонимного просмотра ленты по району, не влияет на персональную ленту по радиусу';

create index posts_district_id_idx on public.posts (district_id);

-- Гость видит активные посты своего района — без адреса/точных координат
-- в UI, только текст/тип/дата (это ограничение уже на уровне фронтенда,
-- не RLS: RLS здесь только про видимость строки).
create policy "posts: anon select active with district"
on public.posts for select
to anon
using (status = 'active' and district_id is not null);
