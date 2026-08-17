import { addMinutes, differenceInMinutes, format, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';

import {
  DAY_END_MINUTE,
  DAY_START_MINUTE,
  MIN_TASK_MINUTES,
  PX_PER_MINUTE,
  SLOT_MINUTES,
} from '@/lib/constants';
import type { Task } from '@/types';

/* -------------------------------------------------------------------------- */
/*  Dakika <-> Date dönüşümleri                                               */
/* -------------------------------------------------------------------------- */

/** Bir tarihin, kendi gününün gece yarısından itibaren kaçıncı dakikada olduğu. */
export function toDayMinutes(date: Date): number {
  return differenceInMinutes(date, startOfDay(date));
}

/** Verilen günün gece yarısına `minutes` eklenmiş yeni bir Date üretir. */
export function fromDayMinutes(day: Date, minutes: number): Date {
  return addMinutes(startOfDay(day), minutes);
}

/* -------------------------------------------------------------------------- */
/*  Snap (mıknatıslanma) ve sınırlama                                         */
/* -------------------------------------------------------------------------- */

/**
 * Dakika değerini en yakın 15'lik dilime yuvarlar.
 * Örn: 07:07 -> 07:00, 07:08 -> 07:15.
 */
export function snapMinutes(minutes: number, slot: number = SLOT_MINUTES): number {
  return Math.round(minutes / slot) * slot;
}

/** Dakikayı gün sınırları [00:00, 24:00] içinde tutar. */
export function clampToDay(minutes: number): number {
  return Math.min(DAY_END_MINUTE, Math.max(DAY_START_MINUTE, minutes));
}

/**
 * Bir bloğun başlangıcını, süresi gün dışına taşmayacak şekilde sınırlar.
 * (Örn. 60 dakikalık bir blok en geç 23:00'te başlayabilir.)
 */
export function clampStart(startMinutes: number, durationMinutes: number): number {
  return Math.min(
    Math.max(DAY_START_MINUTE, startMinutes),
    DAY_END_MINUTE - durationMinutes,
  );
}

/* -------------------------------------------------------------------------- */
/*  Piksel <-> dakika (Timeline geometrisi)                                   */
/* -------------------------------------------------------------------------- */

/** Dakika -> ızgaranın üstünden itibaren piksel ofseti. */
export function minutesToY(minutes: number): number {
  return (minutes - DAY_START_MINUTE) * PX_PER_MINUTE;
}

/** Piksel ofseti -> dakika (ham, snap'lenmemiş). */
export function yToMinutes(y: number): number {
  return DAY_START_MINUTE + y / PX_PER_MINUTE;
}

/** Piksel ofseti -> en yakın 15 dakikalık dilime yapıştırılmış dakika. */
export function yToSnappedMinutes(y: number): number {
  return clampToDay(snapMinutes(yToMinutes(y)));
}

/* -------------------------------------------------------------------------- */
/*  Görev yardımcıları                                                        */
/* -------------------------------------------------------------------------- */

export function getDurationMinutes(task: Pick<Task, 'startTime' | 'endTime'>): number {
  return Math.max(MIN_TASK_MINUTES, differenceInMinutes(task.endTime, task.startTime));
}

export function getStartMinutes(task: Pick<Task, 'startTime'>): number {
  return toDayMinutes(task.startTime);
}

export function getEndMinutes(task: Pick<Task, 'startTime' | 'endTime'>): number {
  return getStartMinutes(task) + getDurationMinutes(task);
}

/** İki görev zaman aralığı olarak kesişiyor mu? (uç uca değme çakışma sayılmaz) */
export function tasksOverlap(a: Task, b: Task): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/** Görev verilen güne mi ait? */
export function isTaskOnDay(task: Task, day: Date): boolean {
  return startOfDay(task.startTime).getTime() === startOfDay(day).getTime();
}

/* -------------------------------------------------------------------------- */
/*  Formatlama                                                                */
/* -------------------------------------------------------------------------- */

/** 09:30 */
export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

/** "09:30 – 11:00" */
export function formatRange(task: Pick<Task, 'startTime' | 'endTime'>): string {
  return `${formatTime(task.startTime)} – ${formatTime(task.endTime)}`;
}

/** 90 -> "1s 30dk", 45 -> "45dk", 120 -> "2s" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}s`;
  return `${h}s ${m}dk`;
}

/** "15 Ağustos Cumartesi" */
export function formatDayLabel(date: Date): string {
  return format(date, 'd MMMM EEEE', { locale: tr });
}

/**
 * Günün kimliği: 'YYYY-MM-DD'.
 *
 * Bilerek `toISOString()` kullanmıyoruz — o UTC'ye çevirir ve gece yarısına
 * yakın saatlerde günü bir kaydırır. Uygulamadaki gün kavramı yereldir.
 */
export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
