-- ChronoFlow — Supabase şeması
-- Supabase panelinde SQL Editor'e yapıştırıp çalıştır. Tekrar çalıştırmak güvenlidir.

-- ---------------------------------------------------------------------------
-- tasks tablosu
-- ---------------------------------------------------------------------------
-- id neden uuid değil de text? Uygulama id'leri istemcide üretiyor
-- (crypto.randomUUID) ve çevrimdışıyken de üretebilmesi gerekiyor. TypeScript
-- tarafında `id: string` olduğu için text en dürüst karşılık; ayrıca eski
-- yerel verideki "mock-1" gibi id'ler de sorunsuz taşınıyor.
create table if not exists public.tasks (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,

  title        text not null,
  description  text,
  start_time   timestamptz not null,
  end_time     timestamptz not null,
  category     text not null
               check (category in ('WORK','ROUTINE','HEALTH','URGENT','SOCIAL','BUFFER')),
  is_completed boolean not null default false,
  is_fixed     boolean not null default false,

  -- Senkronizasyonun iki direği:
  --   updated_at → çakışmada "son yazan kazanır" kararını verir (sunucu saati).
  --   deleted_at → mezar taşı. Telefonda sildiğin blok, bilgisayarın yerel
  --                önbelleğinde hâlâ duruyor olabilir; satırı gerçekten
  --                silseydik senkronda geri dirilirdi.
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- Gün bazlı sorgular ve "şu tarihten sonra değişenler" için.
create index if not exists tasks_user_start_idx   on public.tasks (user_id, start_time);
create index if not exists tasks_user_updated_idx on public.tasks (user_id, updated_at);

-- ---------------------------------------------------------------------------
-- updated_at'i sunucu saatiyle damgala
-- ---------------------------------------------------------------------------
-- İstemcinin gönderdiği saate güvenmiyoruz: telefonun ve bilgisayarın saatleri
-- birkaç dakika kayabilir ve "son yazan kazanır" yanlış tarafa düşebilir.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Satır düzeyi güvenlik (RLS)
-- ---------------------------------------------------------------------------
-- Anon anahtar tarayıcıda açıkta durur; verinin tek koruması bu politikalardır.
-- Kural: herkes yalnızca kendi satırını görür ve değiştirir.
alter table public.tasks enable row level security;

drop policy if exists tasks_select_own on public.tasks;
create policy tasks_select_own on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_delete_own on public.tasks
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Rol izinleri (RLS'in bir alt katmanı)
-- ---------------------------------------------------------------------------
-- RLS satır bazında korur; bu satırlar tablo bazında korur. Giriş yapmamış
-- ziyaretçi (anon) tabloya SQL düzeyinde hiç erişemesin istiyoruz — RLS'te
-- bir hata yapılsa bile ikinci bir duvar kalsın.
--
-- Ayrıca bu izinler sayesinde şema, projedeki "Automatically expose new
-- tables" ayarı kapalı olsa da çalışır.
revoke all on public.tasks from anon;
grant select, insert, update, delete on public.tasks to authenticated;
