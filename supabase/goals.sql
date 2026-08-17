-- ChronoFlow — hedefler (goals)
-- Yalnızca yeni tabloyu ekler; tasks ve day_titles'a dokunmaz.
-- Tekrar çalıştırmak güvenlidir.
--
-- Tarihler neden date değil de text? Uygulamadaki gün kavramı YEREL.
-- 'YYYY-MM-DD' metnini istemcinin yerel tarihinden üretip olduğu gibi
-- saklıyoruz; araya UTC dönüşümü girip gün kaymasın.

create table if not exists public.goals (
  id           text not null,
  user_id      uuid not null references auth.users (id) on delete cascade,

  title        text not null,
  note         text,
  start_date   text not null,
  target_date  text not null,

  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  -- Anahtar kullanıcıyı da içeriyor: iki kullanıcının kimliği asla çarpışmasın.
  -- (tasks tablosunda bu ders çıkarılmadan önce yazılmıştı.)
  primary key (user_id, id)
);

create index if not exists goals_user_target_idx on public.goals (user_id, target_date);

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
  before update on public.goals
  for each row execute function public.touch_updated_at();

alter table public.goals enable row level security;

drop policy if exists goals_select_own on public.goals;
create policy goals_select_own on public.goals
  for select using (auth.uid() = user_id);

drop policy if exists goals_insert_own on public.goals;
create policy goals_insert_own on public.goals
  for insert with check (auth.uid() = user_id);

drop policy if exists goals_update_own on public.goals;
create policy goals_update_own on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists goals_delete_own on public.goals;
create policy goals_delete_own on public.goals
  for delete using (auth.uid() = user_id);

revoke all on public.goals from anon;
grant select, insert, update, delete on public.goals to authenticated;
