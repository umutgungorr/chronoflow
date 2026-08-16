import type { Task, TaskCategory } from '@/types';

/**
 * Test yardımcıları.
 *
 * Sabit bir gün kullanıyoruz (15 Ağustos 2026, yerel saat). Testlerin
 * "bugün"e bağlı olmaması önemli: yarın çalıştırıldığında da aynı sonucu
 * vermeli, gece yarısı geçerken kırılmamalı.
 */

export const GUN = new Date(2026, 7, 15);

function dakika(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** `gorev('a', '09:00', 120, { category: 'WORK' })` */
export function gorev(
  id: string,
  start: string,
  durationMinutes: number,
  options: Partial<Pick<Task, 'category' | 'isFixed' | 'isCompleted' | 'title'>> = {},
): Task {
  const startMinutes = dakika(start);
  return {
    id,
    title: options.title ?? id,
    startTime: new Date(2026, 7, 15, 0, startMinutes),
    endTime: new Date(2026, 7, 15, 0, startMinutes + durationMinutes),
    category: options.category ?? ('WORK' as TaskCategory),
    isCompleted: options.isCompleted ?? false,
    isFixed: options.isFixed ?? false,
  };
}

/** Bir görevi "09:00-11:00" biçiminde okunur hale getirir — hata mesajları için. */
export function aralik(task: Task): string {
  const bicim = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${bicim(task.startTime)}-${bicim(task.endTime)}`;
}

/** Listeyi id → aralık haritasına çevirir; beklentileri tek bakışta yazmak için. */
export function harita(tasks: Task[]): Record<string, string> {
  return Object.fromEntries(tasks.map((t) => [t.id, aralik(t)]));
}
