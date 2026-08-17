-- ChronoFlow — güne verilen ad (day_titles)
-- Bu betik yalnızca YENİ tabloyu ekler; tasks tablosuna ve verisine dokunmaz.
-- Tekrar çalıştırmak güvenlidir.
--
-- `day` neden date değil de text? Uygulamadaki "gün" YEREL bir gündür.
-- Postgres'in date tipine yazarken araya UTC dönüşümü girerse gece yarısına
-- yakın kayıtlar bir gün kayar. Yerel tarihten üretilen 'YYYY-MM-DD' metnini
-- olduğu gibi saklıyoruz.

create table if not exists public.day_titles (
  user_id      uuid not null references auth.users (id) on delete cascade,
  day          text not null,
  title        text not null,

  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  primary key (user_id, day)
);

-- updated_at'i sunucu saatiyle damgala (fonksiyon tasks kurulumunda oluştu).
drop trigger if exists day_titles_touch_updated_at on public.day_titles;
create trigger day_titles_touch_updated_at
  before update on public.day_titles
  for each row execute function public.touch_updated_at();

-- Satır düzeyi güvenlik: herkes yalnızca kendi satırını görür ve değiştirir.
alter table public.day_titles enable row level security;

drop policy if exists day_titles_select_own on public.day_titles;
create policy day_titles_select_own on public.day_titles
  for select using (auth.uid() = user_id);

drop policy if exists day_titles_insert_own on public.day_titles;
create policy day_titles_insert_own on public.day_titles
  for insert with check (auth.uid() = user_id);

drop policy if exists day_titles_update_own on public.day_titles;
create policy day_titles_update_own on public.day_titles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists day_titles_delete_own on public.day_titles;
create policy day_titles_delete_own on public.day_titles
  for delete using (auth.uid() = user_id);

-- Giriş yapmamış ziyaretçi tabloya SQL düzeyinde hiç erişemesin.
revoke all on public.day_titles from anon;
grant select, insert, update, delete on public.day_titles to authenticated;
