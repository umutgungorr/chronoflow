/**
 * Görünüm geometrisi: sürükleme önizlemesi ve çakışan blokların dizilimi.
 *
 * Bu dosya da SAF'tır. Aynı fonksiyonu hem blok (canlı önizleme çizerken)
 * hem de ızgara (bırakma anında store'a yazarken) çağırır — böylece
 * "gözünle gördüğün yer" ile "kaydedilen yer" asla ayrışmaz.
 */

import { DAY_END_MINUTE, DAY_START_MINUTE, MIN_TASK_MINUTES } from '@/lib/constants';
import { getDurationMinutes, getEndMinutes, getStartMinutes, isTaskOnDay } from '@/lib/time';
import type { Task } from '@/types';

export type MinuteRange = { start: number; end: number };

function mergeMinuteRanges(ranges: MinuteRange[]): MinuteRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: MinuteRange[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Gündeki kilitli (tamamlanmış) blokların birleştirilmiş dakika aralıklarını döndürür. */
export function getLockedRanges(
  tasks: Task[],
  day: Date,
  excludeTaskId?: string,
): MinuteRange[] {
  const ranges: MinuteRange[] = [];
  for (const t of tasks) {
    if (t.id === excludeTaskId || !t.isCompleted || !isTaskOnDay(t, day)) continue;
    ranges.push({ start: getStartMinutes(t), end: getEndMinutes(t) });
  }
  return mergeMinuteRanges(ranges);
}

/**
 * Taşınan bloğun başlangıcını kilitli aralıklarla çakışmayan en yakın geçerli
 * konuma oturtur. Gün içinde bloğun sığabileceği boşluk yoksa `null` döner.
 */
export function snapStartOutsideRanges(
  desiredStart: number,
  duration: number,
  locked: MinuteRange[],
  minStart: number = DAY_START_MINUTE,
): number | null {
  const merged = mergeMinuteRanges(locked);
  const gaps: MinuteRange[] = [];
  let cursor = minStart;

  for (const block of merged) {
    if (block.end <= cursor) continue;
    if (block.start > cursor) {
      const gapEnd = Math.min(block.start, DAY_END_MINUTE);
      if (gapEnd - cursor >= duration) {
        gaps.push({ start: cursor, end: gapEnd });
      }
    }
    cursor = Math.max(cursor, block.end);
    if (cursor >= DAY_END_MINUTE) break;
  }

  if (DAY_END_MINUTE - cursor >= duration) {
    gaps.push({ start: cursor, end: DAY_END_MINUTE });
  }

  if (gaps.length === 0) return null;

  let bestStart = gaps[0]!.start;
  let bestDistance = Infinity;

  for (const gap of gaps) {
    const candidate = Math.max(gap.start, Math.min(desiredStart, gap.end - duration));
    const distance = Math.abs(candidate - desiredStart);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestStart = candidate;
    }
  }

  return bestStart;
}

export function clampEndOutsideRanges(
  start: number,
  rawEnd: number,
  locked: MinuteRange[],
): number {
  const merged = mergeMinuteRanges(locked);
  const wall = merged.find((r) => r.start >= start + MIN_TASK_MINUTES)?.start ?? DAY_END_MINUTE;
  const maxEnd = Math.min(DAY_END_MINUTE, wall);
  return Math.min(maxEnd, Math.max(start + MIN_TASK_MINUTES, rawEnd));
}

export function clampStartOutsideRanges(
  rawStart: number,
  end: number,
  locked: MinuteRange[],
  minStart: number = DAY_START_MINUTE,
): number {
  const merged = mergeMinuteRanges(locked);
  let floor = minStart;
  for (const r of merged) {
    if (r.end <= end - MIN_TASK_MINUTES) {
      floor = Math.max(floor, r.end);
    }
  }
  return Math.max(floor, Math.min(rawStart, end - MIN_TASK_MINUTES));
}

/**
 * Boş bir noktaya tıklandığında 15dk yuvarlama komşu bloğun içine düşerse
 * başlangıcı hemen o bloğun bitişine kaydırır.
 */
export function resolveSlotStart(tasks: Task[], day: Date, snappedMinute: number): number {
  const sameDay = tasks
    .filter((t) => isTaskOnDay(t, day))
    .map((t) => ({ start: getStartMinutes(t), end: getEndMinutes(t) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  let candidate = snappedMinute;
  for (const block of sameDay) {
    if (block.start <= candidate && candidate < block.end) {
      candidate = block.end;
    }
  }
  return Math.min(candidate, DAY_END_MINUTE - MIN_TASK_MINUTES);
}

/* -------------------------------------------------------------------------- */
/*  Sürükleme önizlemesi                                                      */
/* -------------------------------------------------------------------------- */

export type DragMode = 'move' | 'resize-start' | 'resize-end';

export type DragPreview = {
  taskId: string;
  mode: DragMode;
  /** İmlecin kat ettiği mesafenin 15dk'ya yuvarlanmış dakika karşılığı. */
  deltaMinutes: number;
};

/** Bir bloğun ızgaradaki yeri: başlangıç dakikası + süre. */
export type Placement = {
  start: number;
  duration: number;
};

/**
 * Sürükleme deltasını göreve uygular ve sonucu gün sınırlarına kırpar.
 *
 * `preview` yoksa görevin kendi yerleşimi döner; bu sayede çağıran taraf
 * "sürükleniyor mu?" diye dallanmak zorunda kalmaz.
 */
export function applyDragPreview(
  task: Task,
  preview: DragPreview | null,
  minStart: number = DAY_START_MINUTE,
  lockedRanges: MinuteRange[] = [],
): Placement {
  const start = getStartMinutes(task);
  const duration = getDurationMinutes(task);

  if (!preview || preview.taskId !== task.id || preview.deltaMinutes === 0) {
    return { start, duration };
  }

  const delta = preview.deltaMinutes;

  switch (preview.mode) {
    case 'move': {
      // Taşımada süre korunur; gün sınırları ve tamamlanmış bloklarla çakışmaz.
      const clamped = Math.min(Math.max(minStart, start + delta), DAY_END_MINUTE - duration);
      if (lockedRanges.length === 0) {
        return { start: clamped, duration };
      }
      const safeStart = snapStartOutsideRanges(clamped, duration, lockedRanges, minStart);
      return { start: safeStart ?? start, duration };
    }

    case 'resize-end': {
      // Alt kenar: başlangıç sabit, süre değişir. En az 15dk, en fazla gün sonu / kilitli blok.
      const nextEnd = clampEndOutsideRanges(start, start + duration + delta, lockedRanges);
      return {
        start,
        duration: nextEnd - start,
      };
    }

    case 'resize-start': {
      // Üst kenar: BİTİŞ sabit kalır, başlangıç kayar → süre ters yönde değişir.
      const end = start + duration;
      const nextStart = clampStartOutsideRanges(start + delta, end, lockedRanges, minStart);
      return { start: nextStart, duration: end - nextStart };
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Çakışan blokların şeritlere (lane) dağıtılması                            */
/* -------------------------------------------------------------------------- */

export type TaskLayout = {
  task: Task;
  /** Bloğun kaçıncı sütunda çizileceği (0 tabanlı). */
  lane: number;
  /** Bu bloğun ait olduğu çakışma kümesindeki toplam sütun sayısı. */
  laneCount: number;
};

/**
 * Aynı saate denk gelen bloklar üst üste binmek yerine yan yana dizilir.
 *
 * Tampon algoritması çakışmaların çoğunu zaten çözüyor; ama sabit (isFixed)
 * bir görev zinciri kırdığında geriye gerçek bir çakışma kalabiliyor.
 * O anda kullanıcının iki bloğu da görmesi gerekir.
 *
 * Algoritma (klasik aralık-grafiği sütunlama):
 *   1. Bloklar başlangıca göre sıralı gelir.
 *   2. Zincirleme kesişen bloklar bir "küme" oluşturur; küme bittiğinde
 *      (yeni blok, kümedeki en geç bitişten sonra başlıyorsa) sütun sayısı
 *      kesinleşir ve küme boşaltılır.
 *   3. Her blok, bitişi kendi başlangıcından önce olan İLK sütuna yerleşir.
 *      Uygun sütun yoksa yeni sütun açılır.
 */
export function layoutOverlaps(sortedTasks: Task[]): TaskLayout[] {
  const out: TaskLayout[] = [];

  let cluster: { task: Task; lane: number }[] = [];
  let laneEnds: number[] = []; // her sütunun o ana kadarki bitiş dakikası
  let clusterEnd = Number.NEGATIVE_INFINITY;

  const flushCluster = () => {
    const laneCount = Math.max(1, laneEnds.length);
    for (const item of cluster) out.push({ ...item, laneCount });
    cluster = [];
    laneEnds = [];
    clusterEnd = Number.NEGATIVE_INFINITY;
  };

  for (const task of sortedTasks) {
    const start = getStartMinutes(task);
    const end = getEndMinutes(task);

    // Bu blok kümenin tamamından sonra başlıyorsa küme kapanır.
    if (start >= clusterEnd) flushCluster();

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      laneEnds.push(end);
      lane = laneEnds.length - 1;
    } else {
      laneEnds[lane] = end;
    }

    cluster.push({ task, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }

  flushCluster();
  return out;
}
