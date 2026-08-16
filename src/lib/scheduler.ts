/**
 * ChronoFlow zamanlama motoru.
 *
 * Buradaki fonksiyonlar SAF'tır (pure): girdi olarak görev listesi alır,
 * yeni bir liste döndürür. React/Zustand'dan tamamen bağımsızdır, bu yüzden
 * birim testi yazmak kolaydır.
 *
 * En önemli parça `reflow()`: "Akıllı Tampon Süreler" özelliğinin kalbi.
 */

import { MIN_TASK_MINUTES, DAY_END_MINUTE, DAY_START_MINUTE } from '@/lib/constants';
import {
  fromDayMinutes,
  getDurationMinutes,
  getEndMinutes,
  getStartMinutes,
  isTaskOnDay,
} from '@/lib/time';
import type { ScheduleResult, Task } from '@/types';

/** Görevleri başlangıç saatine göre (eşitlikte kısa olan önce) sıralar. */
export function sortByStart(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const diff = a.startTime.getTime() - b.startTime.getTime();
    return diff !== 0 ? diff : a.endTime.getTime() - b.endTime.getTime();
  });
}

/** Bir görevin başlangıcını (süresini koruyarak) yeni dakikaya taşır. */
export function withStartMinutes(task: Task, startMinutes: number): Task {
  const duration = getDurationMinutes(task);
  const day = task.startTime;
  return {
    ...task,
    startTime: fromDayMinutes(day, startMinutes),
    endTime: fromDayMinutes(day, startMinutes + duration),
  };
}

/** Bir görevin süresini (başlangıcı sabit tutarak) değiştirir. */
export function withDuration(task: Task, durationMinutes: number): Task {
  const duration = Math.max(MIN_TASK_MINUTES, durationMinutes);
  const start = getStartMinutes(task);
  return {
    ...task,
    endTime: fromDayMinutes(task.startTime, Math.min(DAY_END_MINUTE, start + duration)),
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  REFLOW — "Şok emici" tampon algoritması
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Senaryo: 10:00–11:00 planlanan iş 11:30'a uzadı. Normalde bu, günün geri
 * kalanındaki her bloğu 30dk kaydırırdı. ChronoFlow bunun yerine önce
 * TAMPON (BUFFER) blokları kısaltarak darbeyi emer.
 *
 * Zincir İKİ YÖNE de işler. Bir bloğu aşağı sürüklersen sonrakiler ileri,
 * yukarı sürüklersen öncekiler geriye itilir. Tek yönlü olsaydı davranış
 * asimetrik olurdu: aşağı sürükleyince plan kendini toparlar, yukarı
 * sürükleyince bloklar üst üste binerdi.
 *
 * Her iki geçiş de aynı dört kuralı uygular (yönü ters çevirerek):
 *
 *   cursor = çapanın o yöndeki kenarı
 *   sıradaki her görev için:
 *     1. Arada boşluk varsa                  -> taşma yutuldu, dur.
 *     2. Görev BUFFER ise                    -> taşma kadar KISALT (emilim).
 *          • kalan süre >= 15dk  -> tampon kısalır, taşma tamamen emildi, dur.
 *          • kalan süre <  15dk  -> tampon tamamen tükenir (silinir),
 *                                   kalan taşma bir sonraki göreve devreder.
 *     3. Görev isFixed ise                   -> kaydırılamaz. Çakışma raporlanır,
 *                                              zincir orada kırılır.
 *     4. Aksi halde                          -> görev taşma kadar kayar.
 *
 * Dönüş: yeni görev listesi + hangi blokların kaydığı/emildiği + çakışma mesajı.
 * UI bu raporu kullanarak kullanıcıya "2 blok kaydı, 30dk tampondan yendi"
 * gibi geri bildirim gösterir.
 */

/** İki geçişin ortak defteri. */
type RippleLog = {
  shiftedTaskIds: string[];
  absorbedBufferIds: string[];
  removedIds: Set<string>;
  conflict: string | null;
};

/** Çapadan SONRAKİ blokları ileri iter. */
function rippleForward(result: Task[], anchorIndex: number, log: RippleLog): void {
  // İmleç: bu dakikadan önce yeni bir blok başlayamaz.
  let cursor = getEndMinutes(result[anchorIndex]);

  for (let i = anchorIndex + 1; i < result.length; i++) {
    const current = result[i];
    const start = getStartMinutes(current);
    const duration = getDurationMinutes(current);

    if (start >= cursor) break;

    const overflow = cursor - start;

    if (current.category === 'BUFFER') {
      const remaining = duration - overflow;

      if (remaining >= MIN_TASK_MINUTES) {
        // Tampon kısalıp yeni cursor'dan başlar; taşma tamamen emildi.
        result[i] = {
          ...current,
          startTime: fromDayMinutes(current.startTime, cursor),
          endTime: fromDayMinutes(current.startTime, cursor + remaining),
        };
        log.absorbedBufferIds.push(current.id);
        break;
      }

      log.removedIds.add(current.id);
      log.absorbedBufferIds.push(current.id);
      continue; // cursor değişmez; kalan taşma bir sonraki bloğa uygulanır
    }

    if (current.isFixed) {
      log.conflict = `"${current.title}" sabit bir görev olduğu için kaydırılamadı; ${overflow} dakikalık çakışma var.`;
      break;
    }

    const newStart = Math.min(cursor, DAY_END_MINUTE - duration);
    result[i] = withStartMinutes(current, newStart);
    log.shiftedTaskIds.push(current.id);
    cursor = newStart + duration;
  }
}

/** Çapadan ÖNCEKİ blokları geriye iter — ileri geçişin aynası. */
function rippleBackward(result: Task[], anchorIndex: number, log: RippleLog): void {
  // İmleç: hiçbir blok bu dakikadan sonra bitemez.
  let cursor = getStartMinutes(result[anchorIndex]);

  for (let i = anchorIndex - 1; i >= 0; i--) {
    const current = result[i];
    const end = getEndMinutes(current);
    const duration = getDurationMinutes(current);

    if (end <= cursor) break;

    const overflow = end - cursor;

    if (current.category === 'BUFFER') {
      const remaining = duration - overflow;

      if (remaining >= MIN_TASK_MINUTES) {
        // Tampon bu kez BİTİŞİNDEN kısalır; başlangıcı yerinde kalır.
        result[i] = {
          ...current,
          endTime: fromDayMinutes(current.startTime, cursor),
        };
        log.absorbedBufferIds.push(current.id);
        break;
      }

      log.removedIds.add(current.id);
      log.absorbedBufferIds.push(current.id);
      continue;
    }

    if (current.isFixed) {
      log.conflict = `"${current.title}" sabit bir görev olduğu için kaydırılamadı; ${overflow} dakikalık çakışma var.`;
      break;
    }

    // Geriye itilen blok gün başından taşarsa orada durur ve çakışma kalır.
    const desired = cursor - duration;
    if (desired < DAY_START_MINUTE) {
      result[i] = withStartMinutes(current, DAY_START_MINUTE);
      log.shiftedTaskIds.push(current.id);
      log.conflict = `"${current.title}" gün başına sığmadı; ${DAY_START_MINUTE - desired} dakikalık çakışma var.`;
      break;
    }

    result[i] = withStartMinutes(current, desired);
    log.shiftedTaskIds.push(current.id);
    cursor = desired;
  }
}

export function reflow(allTasks: Task[], anchorId: string): ScheduleResult {
  const anchor = allTasks.find((t) => t.id === anchorId);
  if (!anchor) {
    return { tasks: allTasks, shiftedTaskIds: [], absorbedBufferIds: [], conflict: null };
  }

  // Sadece çapa görevle aynı gündeki blokları hesaba katıyoruz.
  const sameDay = sortByStart(allTasks.filter((t) => isTaskOnDay(t, anchor.startTime)));
  const otherDays = allTasks.filter((t) => !isTaskOnDay(t, anchor.startTime));

  const log: RippleLog = {
    shiftedTaskIds: [],
    absorbedBufferIds: [],
    removedIds: new Set(),
    conflict: null,
  };

  const anchorIndex = sameDay.findIndex((t) => t.id === anchorId);
  const result = [...sameDay];

  // İki geçiş birbirinden bağımsız: biri çapanın solundaki, diğeri sağındaki
  // bloklara dokunuyor. Silinenler sonda süzülüyor ki indeksler kaymasın.
  rippleBackward(result, anchorIndex, log);
  rippleForward(result, anchorIndex, log);

  const cleaned = result.filter((t) => !log.removedIds.has(t.id));
  return {
    tasks: [...otherDays, ...cleaned],
    shiftedTaskIds: log.shiftedTaskIds,
    absorbedBufferIds: log.absorbedBufferIds,
    conflict: log.conflict,
  };
}

/* -------------------------------------------------------------------------- */
/*  Boş zaman analizi (AI "Günüme Dağıt" asistanı Adım 4'te bunu kullanacak)  */
/* -------------------------------------------------------------------------- */

export type FreeSlot = {
  /** Gün içi dakika cinsinden başlangıç. */
  start: number;
  /** Gün içi dakika cinsinden bitiş. */
  end: number;
  /** Türetilmiş uzunluk. */
  duration: number;
};

/**
 * Verilen gündeki dolu bloklar arasında kalan boşlukları döndürür.
 * `from`/`to` ile "çalışma penceresi" daraltılabilir (ör. 08:00–23:00).
 */
export function findFreeSlots(
  tasks: Task[],
  day: Date,
  options: { from?: number; to?: number; minDuration?: number } = {},
): FreeSlot[] {
  const {
    from = DAY_START_MINUTE,
    to = DAY_END_MINUTE,
    minDuration = MIN_TASK_MINUTES,
  } = options;

  // Tampon dahil TÜM bloklar yer kaplar. Aksi halde otomatik yerleştirme
  // (AI planlayıcı, "Blok ekle") tamponun üstüne yazıp çakışma üretirdi.
  const occupied = sortByStart(tasks.filter((t) => isTaskOnDay(t, day)));

  const slots: FreeSlot[] = [];
  let cursor = from;

  for (const task of occupied) {
    const start = getStartMinutes(task);
    const end = getEndMinutes(task);
    if (end <= cursor) continue; // tamamen geride kalmış blok
    if (start > cursor) {
      const slotEnd = Math.min(start, to);
      if (slotEnd - cursor >= minDuration) {
        slots.push({ start: cursor, end: slotEnd, duration: slotEnd - cursor });
      }
    }
    cursor = Math.max(cursor, end);
    if (cursor >= to) break;
  }

  if (to - cursor >= minDuration) {
    slots.push({ start: cursor, end: to, duration: to - cursor });
  }

  return slots;
}

/**
 * Verilen dakikada yeni bir blok açılacak olsa, en fazla kaç dakika sürebilir?
 * Bir sonraki blok (veya gün sonu) duvarına kadar olan boşlukla sınırlanır.
 * Hem tıklayarak eklemede hem de sürükleme önizlemesinde kullanılır.
 */
export function getAvailableDuration(
  tasks: Task[],
  day: Date,
  startMinute: number,
  preferred: number,
): number {
  // `>=`: aynı dakikada başlayan blok da duvardır. Aksi halde bir bloğun
  // hemen üstüne tıklayıp snap ile o dakikaya yuvarlanınca üst üste blok
  // açılırdı.
  const nextStart = sortByStart(tasks.filter((t) => isTaskOnDay(t, day)))
    .map(getStartMinutes)
    .find((start) => start >= startMinute);

  const wall = Math.min(nextStart ?? DAY_END_MINUTE, DAY_END_MINUTE);
  return Math.max(MIN_TASK_MINUTES, Math.min(preferred, wall - startMinute));
}

/** Gün içindeki toplam dolu süre (tampon hariç). */
export function getBookedMinutes(tasks: Task[], day: Date): number {
  return tasks
    .filter((t) => isTaskOnDay(t, day) && t.category !== 'BUFFER')
    .reduce((sum, t) => sum + getDurationMinutes(t), 0);
}
