<div align="center">

# ChronoFlow

**Gününü zaman bloklarıyla planla, hedeflerini takip et ve odağını koru.**

Next.js tabanlı, Türkçe ve local-first günlük planlama uygulaması.

</div>

## Özellikler

- 15 dakikalık çözünürlükte sürükle-bırak zaman bloklama
- Görevler arasında isteğe bağlı akıllı tampon süreleri
- Serbest Türkçe metni günlük plana dönüştüren kural tabanlı planlayıcı
- Günlük istatistikler ve kategori bazlı görünüm
- Tarihli hedefler ve kalan süre takibi
- Geri alma desteği ve otomatik gün geçişi
- Açık/koyu tema ve kurulabilir PWA deneyimi
- Local-first kullanım; Supabase ile isteğe bağlı giriş ve senkronizasyon
- Yönetim ekranı ve giriş yapmış kullanıcılar için sınırlı ziyaret istatistikleri

## Teknoloji yığını

| Katman | Teknolojiler |
|---|---|
| Uygulama | Next.js 16, React 19, TypeScript |
| Arayüz | Tailwind CSS 4, Base UI, Lucide, dnd-kit |
| Durum | Zustand |
| Veri ve kimlik | Supabase |
| Test ve kalite | Vitest, ESLint |
| Ölçüm | Vercel Analytics |

## Yerel kurulum

Gereksinimler: Node.js 20+ ve npm.

```bash
git clone https://github.com/umutgungorr/chronoflow.git
cd chronoflow
npm install
cp .env.example .env.local
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

Supabase değişkenlerini boş bırakırsan uygulama yerel modda çalışır. Veriler tarayıcının `localStorage` alanında tutulur; giriş ve cihazlar arası senkronizasyon devre dışı kalır.

## Ortam değişkenleri

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Supabase kullanacaksan `supabase/` klasöründeki SQL dosyalarını kendi projen üzerinde uygula.

Gerçek anahtarları yalnızca `.env.local` içinde tut; bu dosya Git tarafından izlenmez. Ziyaret kaydı özelliği etkinleştirildiğinde yalnızca giriş yapmış kullanıcıların IP, user-agent, yol ve referer bilgileri yönetici görünümü için saklanır.

## Komutlar

```bash
npm run dev       # geliştirme sunucusu
npm run build     # üretim derlemesi
npm run start     # üretim sunucusu
npm run lint      # kod kalitesi kontrolü
npm test          # testleri bir kez çalıştırır
npm run test:watch
```

## Proje yapısı

```text
src/app/          sayfalar, API rotaları ve PWA tanımları
src/components/   zaman çizelgesi, görev, hedef ve arayüz bileşenleri
src/hooks/        günlük akış ve tarayıcı davranışları
src/lib/          planlama, zaman ve Supabase mantığı
src/store/        Zustand durum yönetimi
src/types/        paylaşılan TypeScript tipleri
supabase/         veritabanı şeması ve ek SQL tanımları
```

## Durum

ChronoFlow aktif geliştirme aşamasında, açık kaynak bir portföy projesidir.

