/**
 * ChronoFlow — Uygulama genelinde kullanılan tip tanımları.
 *
 * NOT: Zaman değerleri bellekte her zaman `Date` nesnesidir.
 * localStorage'a yazılırken ISO string'e çevrilir, okunurken tekrar
 * `Date`'e dönüştürülür (bkz. store/useTaskStore.ts -> reviver).
 */

/** Görev kategorileri. Renk/etiket eşlemesi için CATEGORY_META'ya bakınız. */
export type TaskCategory =
  | 'WORK'
  | 'ROUTINE'
  | 'HEALTH'
  | 'URGENT'
  | 'SOCIAL'
  | 'BUFFER';

export type Task = {
  id: string;
  title: string;
  description?: string;
  /** Görevin başlangıcı (yerel saat). */
  startTime: Date;
  /** Görevin bitişi. Her zaman startTime'dan en az MIN_TASK_MINUTES sonra. */
  endTime: Date;
  category: TaskCategory;
  isCompleted: boolean;
  /** true ise ripple/tampon algoritması bu görevin saatini asla kaydırmaz. */
  isFixed: boolean;
};

/** Yeni görev oluştururken kullanılan girdi tipi (id ve varsayılanlar store'da atanır). */
export type TaskInput = Omit<Task, 'id' | 'isCompleted' | 'isFixed'> &
  Partial<Pick<Task, 'isCompleted' | 'isFixed'>>;

/**
 * Bir kategoriye ait görsel kimlik.
 *
 * Renk sistemi üç parçaya ayrılmıştır:
 *   `bg`      → kategori KİMLİK rengi (brifte belirtilen sınıf). Blok üzerindeki
 *               dikey şerit, lejant noktası ve seçici bu rengi kullanır.
 *   `surface` → aynı rengin şeffaf tonu. Bloğun gövdesi. 24 saatlik ızgarada
 *               6 renk tam doygunlukta yan yana gelince okunmuyor; şeffaf ton
 *               hem açık hem koyu temada aynı hue'yu koruyor.
 *   `border`  → gövde kenarlığı (tampon: kesikli).
 */
export type CategoryMeta = {
  id: TaskCategory;
  /** Türkçe görünen ad. */
  label: string;
  emoji: string;
  /** Kimlik rengi — kategori şeridi ve lejant noktası. */
  bg: string;
  /** Blok gövdesi (kimlik renginin şeffaf tonu). */
  surface: string;
  /** Kenarlık sınıfları (BUFFER kesikli çizgi kullanır). */
  border: string;
  /** İstatistik grafiğinde kullanılacak ham HEX (SVG stroke için). */
  hex: string;
};

export const CATEGORY_META: Record<TaskCategory, CategoryMeta> = {
  WORK: {
    id: 'WORK',
    label: 'İş / Ders',
    emoji: '🔵',
    bg: 'bg-blue-500',
    surface: 'bg-blue-500/12',
    border: 'border border-blue-500/25',
    hex: '#3b82f6',
  },
  ROUTINE: {
    id: 'ROUTINE',
    label: 'Rutin / Kişisel',
    emoji: '🟢',
    bg: 'bg-green-500',
    surface: 'bg-green-500/12',
    border: 'border border-green-500/25',
    hex: '#22c55e',
  },
  HEALTH: {
    id: 'HEALTH',
    label: 'Spor / Sağlık',
    emoji: '🟡',
    bg: 'bg-yellow-500',
    surface: 'bg-yellow-500/15',
    border: 'border border-yellow-500/30',
    hex: '#eab308',
  },
  URGENT: {
    id: 'URGENT',
    label: 'Acil / Kritik',
    emoji: '🔴',
    bg: 'bg-red-500',
    surface: 'bg-red-500/12',
    border: 'border border-red-500/25',
    hex: '#ef4444',
  },
  SOCIAL: {
    id: 'SOCIAL',
    label: 'Dinlenme / Sosyal',
    emoji: '🟣',
    bg: 'bg-purple-500',
    surface: 'bg-purple-500/12',
    border: 'border border-purple-500/25',
    hex: '#a855f7',
  },
  BUFFER: {
    id: 'BUFFER',
    label: 'Esnek Tampon',
    emoji: '⚪',
    // Tampon bilinçli olarak "boş iskele" gibi görünür: şeridi yok, gövdesi
    // neredeyse şeffaf, kenarlığı kesikli. Gün planında yer tutar ama iş vaat etmez.
    bg: 'bg-gray-300',
    surface: 'bg-gray-400/8',
    border: 'border-2 border-dashed border-gray-400/70',
    hex: '#9ca3af',
  },
};

/** Select/picker bileşenlerinde döngüye sokmak için sıralı liste. */
export const CATEGORY_LIST: CategoryMeta[] = Object.values(CATEGORY_META);

/**
 * Bir görevi taşıma/boyutlandırma sonucunda oluşan takvim değişikliğinin raporu.
 * UI bunu toast göstermek için kullanır (ör. "Tampon 30dk kısaldı").
 */
export type ScheduleResult = {
  tasks: Task[];
  /** Ripple sırasında yeri değişen görev id'leri. */
  shiftedTaskIds: string[];
  /** Zamanı emen (kısalan/silinen) tampon blokların id'leri. */
  absorbedBufferIds: string[];
  /** Sabit (isFixed) bir görev yüzünden çözülemeyen çakışma varsa mesaj. */
  conflict: string | null;
};
