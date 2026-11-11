import { addDays, startOfDay } from 'date-fns';

import type { DailyGoal } from '@/lib/goals';
import type { Routine } from '@/lib/routines';
import { dayKey, isTaskOnDay } from '@/lib/time';
import { CATEGORY_META, type Task, type TaskCategory } from '@/types';

/**
 * Motivasyon sayfasının hesapları — saf fonksiyonlar.
 *
 * Tek kaynak: günlük hedefler + takvim blokları + fix aktiviteler (rutinler).
 * Rutinler takvime blok olarak düştüğünde aynı işi iki kez saymamak için
 * aynı başlıklı blok rutinle birleştirilir.
 */

export type MotivationData = {
  tasks: Task[];
  dailyGoals: DailyGoal[];
  routines: Routine[];
  routineCompleted: Record<string, string[]>;
};

export type DayItem = {
  /** Benzersiz anahtar (liste key'i için). */
  key: string;
  kind: 'goal' | 'task' | 'routine';
  /** goal/task için kendi id'si, routine için rutin id'si. */
  id: string;
  title: string;
  category: TaskCategory;
  isCompleted: boolean;
  /** routine kalemi için: rutinin kendi tikinin durumu. */
  routineDone?: boolean;
  /** routine kalemi takvimde bir bloğa dönüştüyse o bloğun id'si ve durumu. */
  taskId?: string;
  taskDone?: boolean;
};

export type DayStats = { total: number; completed: number; rate: number };

/** Bir günün "başarılı" sayılması için gereken tamamlanma oranı (%). */
export const STREAK_THRESHOLD = 70;
/** Geriye dönük taramanın üst sınırı (gün). */
const MAX_LOOKBACK_DAYS = 400;
const XP_PER_ITEM = 20;
const XP_PER_LEVEL = 150;

const norm = (s: string) => s.trim().toLocaleLowerCase('tr-TR');

export function getDayItems(data: MotivationData, day: Date, today: Date): DayItem[] {
  const key = dayKey(day);
  const isFutureOrToday = startOfDay(day).getTime() >= startOfDay(today).getTime();
  const doneIds = data.routineCompleted[key] ?? [];

  const dayTasks = data.tasks.filter((t) => t.category !== 'BUFFER' && isTaskOnDay(t, day));
  const usedTaskIds = new Set<string>();
  const items: DayItem[] = [];

  for (const goal of data.dailyGoals) {
    if (goal.date !== key) continue;
    items.push({
      key: `goal-${goal.id}`,
      kind: 'goal',
      id: goal.id,
      title: goal.title,
      category: goal.category,
      isCompleted: goal.isCompleted,
    });
  }

  const weekday = day.getDay();
  for (const routine of data.routines) {
    if (!routine.days.includes(weekday)) continue;
    const match = dayTasks.find((t) => !usedTaskIds.has(t.id) && norm(t.title) === norm(routine.title));
    const routineDone = doneIds.includes(routine.id);
    // Geçmiş günlere geriye dönük "yapmadın" cezası yazmıyoruz: yalnızca
    // o gün gerçekten bir iz bırakmışsa (tik ya da blok) sayılır.
    if (!isFutureOrToday && !routineDone && !match) continue;
    if (match) usedTaskIds.add(match.id);
    items.push({
      key: `routine-${routine.id}`,
      kind: 'routine',
      id: routine.id,
      title: routine.title,
      category: routine.category,
      isCompleted: routineDone || (match?.isCompleted ?? false),
      routineDone,
      taskId: match?.id,
      taskDone: match?.isCompleted,
    });
  }

  for (const task of dayTasks) {
    if (usedTaskIds.has(task.id)) continue;
    items.push({
      key: `task-${task.id}`,
      kind: 'task',
      id: task.id,
      title: task.title,
      category: task.category,
      isCompleted: task.isCompleted,
    });
  }

  return items;
}

export function getDayStats(items: DayItem[]): DayStats {
  const total = items.length;
  const completed = items.filter((i) => i.isCompleted).length;
  return { total, completed, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

function isSuccessfulDay(stats: DayStats): boolean {
  return stats.total > 0 && stats.rate >= STREAK_THRESHOLD;
}

/**
 * Seri: bugünden geriye doğru ardışık başarılı gün sayısı.
 * Bugün henüz bitmediyse seriyi bozmaz — dünden itibaren sayılır.
 */
export function getStreak(data: MotivationData, now: Date): { current: number; best: number } {
  const today = startOfDay(now);
  const success: boolean[] = [];
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const day = addDays(today, -i);
    success.push(isSuccessfulDay(getDayStats(getDayItems(data, day, today))));
  }

  let current = 0;
  const start = success[0] ? 0 : 1;
  for (let i = start; i < success.length && success[i]; i++) current += 1;

  let best = 0;
  let run = 0;
  for (const ok of success) {
    run = ok ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current, best };
}

export function getTotalXp(data: MotivationData, now: Date): number {
  const today = startOfDay(now);
  let xp = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    xp += getDayStats(getDayItems(data, addDays(today, -i), today)).completed * XP_PER_ITEM;
  }
  return xp;
}

export function getLevel(xp: number): { level: number; xpInLevel: number; xpForNext: number } {
  return {
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    xpInLevel: xp % XP_PER_LEVEL,
    xpForNext: XP_PER_LEVEL,
  };
}

export type Insight = { tone: 'good' | 'warn' | 'bad'; text: string };

/**
 * Jenerik söz yerine gerçek veriye dayalı, lafı dolandırmayan geri bildirim.
 * `weekDays` Pzt-Paz sırasında 7 gün.
 */
export function getWeekInsights(
  data: MotivationData,
  weekDays: Date[],
  now: Date,
  streak: number,
): Insight[] {
  const today = startOfDay(now);
  const insights: Insight[] = [];

  const byCategory = new Map<TaskCategory, { done: number; total: number }>();
  let missedPast = 0;
  let todayLeft = 0;
  let weekTotal = 0;

  for (const day of weekDays) {
    const items = getDayItems(data, day, today);
    const isPast = startOfDay(day).getTime() < today.getTime();
    const isToday = startOfDay(day).getTime() === today.getTime();
    weekTotal += items.length;
    for (const item of items) {
      // Gelecek günler henüz "başarısızlık" değil; kategori analizine girmez.
      if (!isPast && !isToday) continue;
      const entry = byCategory.get(item.category) ?? { done: 0, total: 0 };
      entry.total += 1;
      if (item.isCompleted) entry.done += 1;
      byCategory.set(item.category, entry);
      if (isPast && !item.isCompleted) missedPast += 1;
      if (isToday && !item.isCompleted) todayLeft += 1;
    }
  }

  if (weekTotal === 0) {
    return [{ tone: 'bad', text: 'Bu hafta tek bir hedef yok. Plansız hafta, ilerlemesiz hafta demek.' }];
  }

  const rated = [...byCategory.entries()]
    .filter(([cat, v]) => cat !== 'BUFFER' && v.total >= 2)
    .map(([cat, v]) => ({ cat, ...v, rate: Math.round((v.done / v.total) * 100) }))
    .sort((a, b) => a.rate - b.rate);

  if (rated.length >= 2) {
    const worst = rated[0];
    const best = rated[rated.length - 1];
    if (worst.rate < 50) {
      insights.push({
        tone: 'bad',
        text: `${CATEGORY_META[worst.cat].label}: ${worst.done}/${worst.total} (%${worst.rate}). Burayı ihmal ediyorsun.`,
      });
    }
    if (best.rate >= 70 && best.cat !== worst.cat) {
      insights.push({
        tone: 'good',
        text: `${CATEGORY_META[best.cat].label}: ${best.done}/${best.total} (%${best.rate}). En sağlam alanın bu.`,
      });
    }
  } else if (rated.length === 1) {
    const only = rated[0];
    insights.push({
      tone: only.rate >= 70 ? 'good' : 'warn',
      text: `${CATEGORY_META[only.cat].label} dışında hiçbir şey planlamamışsın; ${only.done}/${only.total} bitti.`,
    });
  }

  if (missedPast > 0) {
    insights.push({
      tone: 'warn',
      text: `Geçen günlerden ${missedPast} tamamlanmamış kalem var. Ya yap ya da sil, öylece durması seni yavaşlatıyor.`,
    });
  }

  if (todayLeft > 0) {
    insights.push({
      tone: 'warn',
      text: `Bugün ${todayLeft} kalem kaldı${streak > 0 ? `; ${streak} günlük serin buna bağlı` : ''}.`,
    });
  } else if (streak >= 3) {
    insights.push({ tone: 'good', text: `${streak} gündür seri halindesin. Bunu bozma.` });
  }

  if (insights.length === 0) {
    insights.push({ tone: 'good', text: 'Şu an söyleyecek kötü bir şey yok. Tempoyu koru.' });
  }
  return insights.slice(0, 4);
}
