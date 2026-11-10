/**
 * Günün değerlendirmesi.
 *
 * `summarizeDay` günü sayılara indirger (LLM'e giden tek şey bu — görev
 * başlıkları dahil değil, özet kadar paylaşılır). `localReview` aynı özetten
 * kural tabanlı Türkçe bir yorum üretir; LLM yoksa/başarısızsa devreye girer.
 */

import { getDurationMinutes, formatDuration, isTaskOnDay } from '@/lib/time';
import type { Task, TaskCategory } from '@/types';
import { CATEGORY_META } from '@/types';

export type DaySummary = {
  plannedMinutes: number;
  completedMinutes: number;
  taskCount: number;
  completedCount: number;
  /** 0-100. Planlı iş yoksa 0. */
  completionRate: number;
  byCategory: Partial<Record<TaskCategory, number>>;
  /** Tamamlanmamış blokların başlıkları (en çok 5) — yarın için öneri bağlamı. */
  openTitles: string[];
};

export function summarizeDay(tasks: Task[], day: Date): DaySummary {
  const work = tasks.filter((t) => isTaskOnDay(t, day) && t.category !== 'BUFFER');

  const byCategory: Partial<Record<TaskCategory, number>> = {};
  let planned = 0;
  let completed = 0;
  let completedCount = 0;

  for (const task of work) {
    const minutes = getDurationMinutes(task);
    planned += minutes;
    byCategory[task.category] = (byCategory[task.category] ?? 0) + minutes;
    if (task.isCompleted) {
      completed += minutes;
      completedCount += 1;
    }
  }

  return {
    plannedMinutes: planned,
    completedMinutes: completed,
    taskCount: work.length,
    completedCount,
    completionRate: planned === 0 ? 0 : Math.round((completed / planned) * 100),
    byCategory,
    openTitles: work
      .filter((t) => !t.isCompleted)
      .slice(0, 5)
      .map((t) => t.title),
  };
}

/** Kural tabanlı yorum — ağ gerektirmez. */
export function localReview(summary: DaySummary): string {
  if (summary.taskCount === 0) {
    return 'Bu güne henüz blok koymamışsın. "Günüme dağıt" ile ya da bir şablonla başlayabilirsin.';
  }

  const lines: string[] = [];
  lines.push(
    `${summary.taskCount} bloktan ${summary.completedCount} tanesini bitirdin ` +
      `(${formatDuration(summary.completedMinutes)} / ${formatDuration(summary.plannedMinutes)}, %${summary.completionRate}).`,
  );

  const top = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const meta = CATEGORY_META[top[0] as TaskCategory];
    lines.push(`En çok zaman: ${meta.label} (${formatDuration(top[1])}).`);
  }

  if (summary.plannedMinutes > 10 * 60) {
    lines.push('Plan 10 saati aşıyor; yarın biraz hafifletip tampon payı bırakmayı düşün.');
  }

  if (summary.completionRate >= 80) {
    lines.push('Harika bir gündü, ritmini koru.');
  } else if (summary.openTitles.length > 0) {
    lines.push(`Yarına taşıyabileceklerin: ${summary.openTitles.join(', ')}.`);
  }

  return lines.join(' ');
}
