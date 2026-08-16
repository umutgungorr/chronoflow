/**
 * "Günüme Dağıt" — serbest metni gün planına çeviren motor.
 *
 * Örnek girdi:
 *   "Bugün 2 saat kod yazacağım, 1 saat spor yapacağım, akşam 30 dk kitap okuyacağım"
 *
 * İki aşama:
 *   1. parseSchedulePrompt() → metni {başlık, süre, kategori, zaman tercihi}
 *      listesine ayırır. Tamamen kural tabanlı; ağ isteği yok, deterministik.
 *   2. planIntoDay()         → bu listeyi günün BOŞ aralıklarına ilk-uyan
 *      (first-fit) yöntemiyle yerleştirir.
 *
 * Not: Bir LLM'e bağlanmak istenirse yalnızca 1. aşama değişir —
 * `parseSchedulePrompt` yerine modelden aynı `ScheduleItem[]` şeması
 * istenir, yerleştirme mantığı olduğu gibi kalır.
 */

import { MIN_TASK_MINUTES, SLOT_MINUTES } from '@/lib/constants';
import { findFreeSlots } from '@/lib/scheduler';
import { snapMinutes } from '@/lib/time';
import type { Task, TaskCategory } from '@/types';

/* -------------------------------------------------------------------------- */
/*  1. Ayrıştırma                                                             */
/* -------------------------------------------------------------------------- */

/** Metinde geçen günün bölümü — yerleştirme penceresini daraltır. */
export type DayPart = 'sabah' | 'ogle' | 'aksam' | null;

export type ScheduleItem = {
  title: string;
  duration: number;
  category: TaskCategory;
  dayPart: DayPart;
};

/** Kategori tahmini için anahtar kelimeler. Sıra önemli: ilk eşleşen kazanır. */
const CATEGORY_KEYWORDS: [TaskCategory, string[]][] = [
  ['URGENT', ['acil', 'kritik', 'son gün', 'deadline', 'fatura', 'ödeme', 'teslim']],
  [
    'HEALTH',
    ['spor', 'koş', 'yürüyüş', 'yüzme', 'bisiklet', 'antrenman', 'yoga', 'gym', 'fitness', 'doktor', 'diş', 'sağlık'],
  ],
  [
    'WORK',
    ['kod', 'ders', 'çalış', 'proje', 'iş', 'toplantı', 'rapor', 'ödev', 'sınav', 'sunum', 'tasarım', 'yaz', 'okul', 'mail', 'e-posta'],
  ],
  [
    'SOCIAL',
    ['kitap', 'film', 'dizi', 'arkadaş', 'oyun', 'müzik', 'dinlen', 'mola', 'kahve', 'sosyal', 'aile', 'gez', 'sohbet'],
  ],
  [
    'ROUTINE',
    ['yemek', 'kahvaltı', 'alışveriş', 'market', 'temizlik', 'duş', 'uyku', 'rutin', 'çamaşır', 'bulaşık', 'köpek', 'kedi'],
  ],
];

/** Türkçe sayı sözcükleri. */
const NUMBER_WORDS: Record<string, number> = {
  yarım: 0.5,
  bir: 1,
  iki: 2,
  üç: 3,
  uc: 3,
  dört: 4,
  dort: 4,
  beş: 5,
  bes: 5,
  altı: 6,
  alti: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
};

/** Başlıktan atılacak dolgu ve fiil kalıpları. */
const NOISE_PATTERNS = [
  /\b(bugün|yarın|bu\s+gün)\b/gi,
  /\b(sabah|öğlen|öğle|akşam|gece)\b/gi,
  /\b(yapacağım|yapıcam|yapmalıyım|yapmam\s+lazım|yapayım)\b/gi,
  /\b(yazacağım|yazıcam|okuyacağım|okuycam|çalışacağım|çalışıcam)\b/gi,
  /\b(gideceğim|gidicem|alacağım|edeceğim|ayıracağım|vereceğim)\b/gi,
  /\b(istiyorum|planlıyorum|lazım|gerek|olacak|var)\b/gi,
];

function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase().replace(',', '.');
  if (cleaned in NUMBER_WORDS) return NUMBER_WORDS[cleaned];
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

const NUMBER_TOKEN = `\\d+(?:[.,]\\d+)?|${Object.keys(NUMBER_WORDS).join('|')}`;
const HOUR_RE = new RegExp(`(${NUMBER_TOKEN})\\s*(buçuk\\s*)?(saat|saatlik|sa\\b)`, 'i');
const MINUTE_RE = new RegExp(`(${NUMBER_TOKEN})\\s*(dakika|dakka|dk\\b|dak\\b)`, 'i');

function detectCategory(text: string): TaskCategory {
  const lower = text.toLowerCase();
  for (const [category, words] of CATEGORY_KEYWORDS) {
    if (words.some((word) => lower.includes(word))) return category;
  }
  return 'WORK';
}

function detectDayPart(text: string): DayPart {
  const lower = text.toLowerCase();
  if (/\bsabah/.test(lower)) return 'sabah';
  if (/\böğle|\boglen|\böğlen/.test(lower)) return 'ogle';
  if (/\bakşam|\baksam|\bgece/.test(lower)) return 'aksam';
  return null;
}

function cleanTitle(text: string): string {
  let title = text;
  for (const pattern of NOISE_PATTERNS) title = title.replace(pattern, ' ');
  title = title
    .replace(HOUR_RE, ' ')
    .replace(MINUTE_RE, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:-]+|[\s.,;:-]+$/g, '');

  if (!title) return 'Blok';
  return title.charAt(0).toLocaleUpperCase('tr-TR') + title.slice(1);
}

/**
 * Serbest metni planlanabilir maddelere ayırır.
 * Süre bulunamayan maddelere 1 saat varsayılır.
 */
export function parseSchedulePrompt(text: string): ScheduleItem[] {
  return text
    // Virgül hem madde ayırıcı hem Türkçe ondalık ayracı. İki rakamın
    // ARASINDAKİ virgülde bölmüyoruz, yoksa "1,5 saat" ikiye ayrılır ve
    // geriye "5 saat" kalırdı — sessizce beş katı uzun bir blok.
    .split(/(?<!\d),|,(?!\d)|[;\n]|\bve\b|\bsonra\b|\bardından\b/i)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 1)
    .map((segment) => {
      const hourMatch = HOUR_RE.exec(segment);
      const minuteMatch = MINUTE_RE.exec(segment);

      let duration = 0;
      if (hourMatch) {
        const value = parseNumber(hourMatch[1]);
        // "bir buçuk saat" → 1 + 0.5
        if (value !== null) duration += (value + (hourMatch[2] ? 0.5 : 0)) * 60;
      }
      if (minuteMatch) {
        const value = parseNumber(minuteMatch[1]);
        if (value !== null) duration += value;
      }
      if (duration <= 0) duration = 60;

      return {
        title: cleanTitle(segment),
        duration: Math.max(MIN_TASK_MINUTES, snapMinutes(duration)),
        category: detectCategory(segment),
        dayPart: detectDayPart(segment),
      };
    });
}

/* -------------------------------------------------------------------------- */
/*  2. Yerleştirme                                                            */
/* -------------------------------------------------------------------------- */

export type PlannedBlock = {
  title: string;
  category: TaskCategory;
  start: number;
  duration: number;
};

export type PlanResult = {
  blocks: PlannedBlock[];
  /** Güne sığmayan maddeler. */
  skipped: ScheduleItem[];
};

/** Günün bölümlerine karşılık gelen dakika pencereleri. */
const DAY_PART_WINDOWS: Record<Exclude<DayPart, null>, [number, number]> = {
  sabah: [6 * 60, 12 * 60],
  ogle: [12 * 60, 15 * 60],
  aksam: [18 * 60, 24 * 60],
};

type PlanOptions = {
  /** Bu dakikadan önce blok açılmaz (bugün için "şimdi"). */
  from: number;
  /** Bu dakikadan sonra blok açılmaz. */
  to: number;
  /** Bloklar arasına 15dk tampon eklensin mi? */
  withBuffers: boolean;
};

/**
 * Maddeleri günün boş aralıklarına ilk-uyan yöntemiyle yerleştirir.
 *
 * Her yerleştirmeden sonra boşluklar YENİDEN hesaplanır — yeni blok
 * (ve varsa tamponu) bir sonraki madde için artık dolu alandır.
 * Zaman tercihi olan maddeler (sabah/akşam) önce kendi penceresini dener,
 * sığmazsa günün kalanına düşer.
 */
export function planIntoDay(
  tasks: Task[],
  day: Date,
  items: ScheduleItem[],
  options: PlanOptions,
): PlanResult {
  const blocks: PlannedBlock[] = [];
  const skipped: ScheduleItem[] = [];

  // Yerleştirdikçe büyüyen sanal görev listesi: boşluk hesabı buna göre yapılır.
  const occupied: Task[] = [...tasks];
  const asTask = (start: number, duration: number): Task =>
    ({
      id: `plan-${start}-${duration}`,
      title: '',
      startTime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, start),
      endTime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, start + duration),
      category: 'WORK',
      isCompleted: false,
      isFixed: false,
    }) satisfies Task;

  for (const item of items) {
    const windows: [number, number][] = [];
    if (item.dayPart) {
      const [wStart, wEnd] = DAY_PART_WINDOWS[item.dayPart];
      windows.push([Math.max(wStart, options.from), Math.min(wEnd, options.to)]);
    }
    windows.push([options.from, options.to]);

    // Tampon isteniyorsa bloğun ardına 15dk daha yer aramamız gerekir.
    const needed = item.duration + (options.withBuffers ? SLOT_MINUTES : 0);

    let placed: PlannedBlock | null = null;
    for (const [from, to] of windows) {
      if (to - from < item.duration) continue;
      const slot = findFreeSlots(occupied, day, { from, to, minDuration: item.duration }).find(
        (candidate) => candidate.duration >= item.duration,
      );
      if (!slot) continue;

      placed = {
        title: item.title,
        category: item.category,
        start: slot.start,
        duration: item.duration,
      };

      // Tampon yalnızca gerçekten sığıyorsa eklenir; sığmazsa blok yine konur.
      const withBuffer = options.withBuffers && slot.duration >= needed;
      occupied.push(asTask(slot.start, item.duration + (withBuffer ? SLOT_MINUTES : 0)));
      blocks.push(placed);
      if (withBuffer) {
        blocks.push({
          title: 'Tampon',
          category: 'BUFFER',
          start: slot.start + item.duration,
          duration: SLOT_MINUTES,
        });
      }
      break;
    }

    if (!placed) skipped.push(item);
  }

  return { blocks, skipped };
}
