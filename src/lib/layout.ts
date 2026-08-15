/**
 * Görünüm geometrisi: sürükleme önizlemesi ve çakışan blokların dizilimi.
 *
 * Bu dosya da SAF'tır. Aynı fonksiyonu hem blok (canlı önizleme çizerken)
 * hem de ızgara (bırakma anında store'a yazarken) çağırır — böylece
 * "gözünle gördüğün yer" ile "kaydedilen yer" asla ayrışmaz.
 */

import { DAY_END_MINUTE, MIN_TASK_MINUTES } from '@/lib/constants';
import { clampStart, getDurationMinutes, getEndMinutes, getStartMinutes } from '@/lib/time';
import type { Task } from '@/types';

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
export function applyDragPreview(task: Task, preview: DragPreview | null): Placement {
  const start = getStartMinutes(task);
  const duration = getDurationMinutes(task);

  if (!preview || preview.taskId !== task.id || preview.deltaMinutes === 0) {
    return { start, duration };
  }

  const delta = preview.deltaMinutes;

  switch (preview.mode) {
    case 'move':
      // Taşımada süre korunur; yalnızca başlangıç kayar ve gün dışına taşamaz.
      return { start: clampStart(start + delta, duration), duration };

    case 'resize-end': {
      // Alt kenar: başlangıç sabit, süre değişir. En az 15dk, en fazla gün sonu.
      const maxDuration = DAY_END_MINUTE - start;
      return {
        start,
        duration: Math.min(maxDuration, Math.max(MIN_TASK_MINUTES, duration + delta)),
      };
    }

    case 'resize-start': {
      // Üst kenar: BİTİŞ sabit kalır, başlangıç kayar → süre ters yönde değişir.
      const end = start + duration;
      const nextStart = Math.max(0, Math.min(start + delta, end - MIN_TASK_MINUTES));
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
