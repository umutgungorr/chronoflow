-- ChronoFlow — yönetici paneli (admins + visits + admin_users)
-- Yalnızca yeni nesneler ekler; tasks / day_titles / goals'a dokunmaz.
-- Tekrar çalıştırmak güvenlidir.

-- ---------------------------------------------------------------------------
-- 1) Yönetici listesi
-- ---------------------------------------------------------------------------
-- Uygulamada "rol" kavramı yoktu; en dar hâliyle ekliyoruz: bu tabloda
-- kimlik kimin varsa yönetici odur. Kimse kendini ekleyemez — tabloya
-- yazma yetkisi yok, yalnızca SQL Editor'den (yani sen) eklenir.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins
  for select using (auth.uid() = user_id);

revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

-- Proje sahibini yönetici yap. Çalıştırmadan önce adresi kendi hesabınla değiştir.
insert into public.admins (user_id)
select id from auth.users where email = 'YOUR_EMAIL@example.com'
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Ziyaret kaydı
-- ---------------------------------------------------------------------------
-- IP yalnızca sunucu tarafında görülebildiği için satırları /api/visit
-- route handler'ı yazar. Yalnızca doğrulanmış oturumu olan kullanıcıların
-- ziyaretleri kaydedilir.
create table if not exists public.visits (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  user_id     uuid references auth.users (id) on delete set null,
  ip          text,
  user_agent  text,
  path        text,
  referer     text
);

create index if not exists visits_occurred_idx on public.visits (occurred_at desc);

alter table public.visits enable row level security;

-- Okuma: yalnızca yönetici.
drop policy if exists visits_select_admin on public.visits;
create policy visits_select_admin on public.visits
  for select using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Yazma: yalnızca giriş yapmış kullanıcı kendi adına kayıt ekleyebilir.
drop policy if exists visits_insert_own on public.visits;
create policy visits_insert_own on public.visits
  for insert with check (auth.uid() = user_id);

revoke all on public.visits from anon, authenticated;
grant insert on public.visits to authenticated;
grant select on public.visits to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Kullanıcı özeti
-- ---------------------------------------------------------------------------
-- auth.users istemciden okunamaz. Bu fonksiyon tanımlayıcının yetkisiyle
-- (security definer) çalışır ama İLK İŞ OLARAK çağıranın yönetici olup
-- olmadığına bakar; değilse hiç satır dönmez.
create or replace function public.admin_users()
returns table (
  user_id          uuid,
  email            text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz,
  task_count       bigint,
  goal_count       bigint
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    (select count(*) from public.tasks t
      where t.user_id = u.id and t.deleted_at is null),
    (select count(*) from public.goals g
      where g.user_id = u.id and g.deleted_at is null)
  from auth.users u
  where exists (select 1 from public.admins a where a.user_id = auth.uid())
  order by u.created_at desc;
$$;

revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;
