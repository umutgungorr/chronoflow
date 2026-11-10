/**
 * Rutinler ve gün şablonları.
 *
 * İkisi de aynı işi yapar: günün BELİRLİ saatlerine hazır bloklar koymak.
 * Fark kaynağında — rutin kullanıcının tekrarlayan kuralı, şablon hazır paket.
 * Her ikisi de mevcut bloklarla ÇAKIŞMAZ: çakışan madde atlanır, kullanıcının
 * elle koyduğu hiçbir blok ezilmez ya da kaydırılmaz.
 *
 * Saf fonksiyonlar: React/Zustand'a bağımlı değil, id üreteci dışarıdan gelir.
 */

import { DAY_END_MINUTE, MIN_TASK_MINUTES } from '@/lib/constants';
import { fromDayMinutes, getEndMinutes, getStartMinutes, isTaskOnDay } from '@/lib/time';
import type { Task, TaskCategory } from '@/types';

/** Tekrarlayan blok kuralı. `days`: 0 = Pazar … 6 = Cumartesi (JS getDay). */
export type Routine = {
  id: string;
  title: string;
  category: TaskCategory;
  /** Gün içi başlangıç dakikası. */
  start: number;
  duration: number;
  days: number[];
  isFixed: boolean;
};

export type RoutineInput = Omit<Routine, 'id'>;

/** Hafta içi / hafta sonu / her gün kısayolları (UI için). */
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKEND = [0, 6];
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** Pazartesi'den başlayan görüntü sırası ve Türkçe kısa adlar. */
export const DAY_LABELS: { day: number; label: string }[] = [
  { day: 1, label: 'Pzt' },
  { day: 2, label: 'Sal' },
  { day: 3, label: 'Çar' },
  { day: 4, label: 'Per' },
  { day: 5, label: 'Cum' },
  { day: 6, label: 'Cmt' },
  { day: 0, label: 'Paz' },
];

export type BlockSpec = {
  title: string;
  category: TaskCategory;
  start: number;
  duration: number;
  isFixed?: boolean;
};

/**
 * Hazır blok listesini güne yerleştirir. Çakışan maddeler `skipped`
 * sayılır. Önceki yerleşen maddeler de sonrakilere engel olur.
 */
export function placeBlocks(
  tasks: Task[],
  day: Date,
  specs: BlockSpec[],
  createId: () => string,
): { created: Task[]; skipped: number } {
  const occupied: [number, number][] = tasks
    .filter((t) => isTaskOnDay(t, day))
    .map((t) => [getStartMinutes(t), getEndMinutes(t)]);

  const created: Task[] = [];
  let skipped = 0;

  for (const spec of specs) {
    const start = Math.max(0, spec.start);
    const end = Math.min(DAY_END_MINUTE, start + Math.max(MIN_TASK_MINUTES, spec.duration));
    const overlaps = occupied.some(([s, e]) => start < e && end > s);

    if (overlaps || end - start < MIN_TASK_MINUTES) {
      skipped += 1;
      continue;
    }

    occupied.push([start, end]);
    created.push({
      id: createId(),
      title: spec.title,
      startTime: fromDayMinutes(day, start),
      endTime: fromDayMinutes(day, end),
      category: spec.category,
      isCompleted: false,
      isFixed: spec.isFixed ?? false,
    });
  }

  return { created, skipped };
}

/** O gün (haftanın günü) için geçerli rutinler. */
export function routinesForDay(routines: Routine[], day: Date): Routine[] {
  const weekday = day.getDay();
  return routines.filter((r) => r.days.includes(weekday));
}

/**
 * Güne henüz uygulanmamış rutinleri yerleştirir.
 *
 * `appliedIds` = o güne daha önce işlenmiş rutinler. Atlananlar da dahil:
 * kullanıcı bir rutin bloğunu sildiyse ertesi render'da geri gelmemeli.
 */
export function planRoutinesIntoDay(
  tasks: Task[],
  routines: Routine[],
  day: Date,
  appliedIds: string[],
  createId: () => string,
): { created: Task[]; handledIds: string[] } {
  const pending = routinesForDay(routines, day).filter((r) => !appliedIds.includes(r.id));
  if (pending.length === 0) return { created: [], handledIds: [] };

  const { created } = placeBlocks(
    tasks,
    day,
    pending.map((r) => ({
      title: r.title,
      category: r.category,
      start: r.start,
      duration: r.duration,
      isFixed: r.isFixed,
    })),
    createId,
  );

  return { created, handledIds: pending.map((r) => r.id) };
}

/* -------------------------------------------------------------------------- */
/*  Gün şablonları                                                            */
/* -------------------------------------------------------------------------- */

export type DayTemplate = {
  id: string;
  name: string;
  description: string;
  blocks: BlockSpec[];
};

const h = (hour: number, minute = 0) => hour * 60 + minute;

export const DAY_TEMPLATES: DayTemplate[] = [
  {
    id: 'weekend',
    name: 'Hafta sonu',
    description: 'Rahat bir sabah, dışarı çıkma ve akşam dinlenmesi.',
    blocks: [
      { title: 'Yavaş kahvaltı', category: 'ROUTINE', start: h(9, 30), duration: 60 },
      { title: 'Yürüyüş / spor', category: 'HEALTH', start: h(11), duration: 90 },
      { title: 'Ev işleri & alışveriş', category: 'ROUTINE', start: h(13, 30), duration: 90 },
      { title: 'Arkadaş / aile', category: 'SOCIAL', start: h(16), duration: 120 },
      { title: 'Film / kitap', category: 'SOCIAL', start: h(20), duration: 90 },
    ],
  },
  {
    id: 'exam',
    name: 'Sınav günü',
    description: 'Sıkı çalışma blokları, aralarda tampon ve mola.',
    blocks: [
      { title: 'Kahvaltı', category: 'ROUTINE', start: h(8), duration: 30 },
      { title: 'Çalışma 1', category: 'WORK', start: h(9), duration: 120 },
      { title: 'Tampon', category: 'BUFFER', start: h(11), duration: 15 },
      { title: 'Çalışma 2', category: 'WORK', start: h(11, 15), duration: 105 },
      { title: 'Öğle yemeği & mola', category: 'ROUTINE', start: h(13), duration: 60 },
      { title: 'Çalışma 3', category: 'WORK', start: h(14), duration: 120 },
      { title: 'Tampon', category: 'BUFFER', start: h(16), duration: 15 },
      { title: 'Tekrar & deneme', category: 'WORK', start: h(16, 15), duration: 105 },
      { title: 'Yürüyüş', category: 'HEALTH', start: h(18), duration: 45 },
    ],
  },
  {
    id: 'free',
    name: 'Boş gün',
    description: 'Hafif bir iskelet: hareket, bir odak bloğu, dinlenme.',
    blocks: [
      { title: 'Sabah rutini', category: 'ROUTINE', start: h(9), duration: 45 },
      { title: 'Spor', category: 'HEALTH', start: h(10), duration: 60 },
      { title: 'Odak bloğu', category: 'WORK', start: h(14), duration: 120 },
      { title: 'Dinlenme', category: 'SOCIAL', start: h(19), duration: 90 },
    ],
  },
  {
    id: 'workday',
    name: 'İş günü',
    description: 'Derin çalışma, toplantı payı ve gün sonu toparlama.',
    blocks: [
      { title: 'Güne başlama', category: 'ROUTINE', start: h(8, 30), duration: 30 },
      { title: 'Derin çalışma', category: 'WORK', start: h(9), duration: 120 },
      { title: 'Tampon', category: 'BUFFER', start: h(11), duration: 30 },
      { title: 'Toplantılar / e-posta', category: 'WORK', start: h(11, 30), duration: 60 },
      { title: 'Öğle arası', category: 'ROUTINE', start: h(12, 30), duration: 60 },
      { title: 'Derin çalışma 2', category: 'WORK', start: h(14), duration: 120 },
      { title: 'Gün sonu toparlama', category: 'WORK', start: h(17), duration: 30 },
    ],
  },
];

export function planTemplateIntoDay(
  tasks: Task[],
  day: Date,
  template: DayTemplate,
  createId: () => string,
) {
  return placeBlocks(tasks, day, template.blocks, createId);
}
