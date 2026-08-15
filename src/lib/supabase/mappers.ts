import type { TaskRow } from '@/lib/supabase/client';
import type { Task } from '@/types';

/**
 * Veritabanı satırı ↔ uygulama görevi çevirisi.
 *
 * İki dünya iki dil konuşuyor: SQL tarafı snake_case ve ISO string,
 * uygulama tarafı camelCase ve `Date`. Çeviriyi tek yerde tutuyoruz ki
 * alan adı bir yerde değişince derleyici bizi buraya getirsin.
 */

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    category: row.category,
    isCompleted: row.is_completed,
    isFixed: row.is_fixed,
  };
}

export function taskToRow(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description ?? null,
    start_time: task.startTime.toISOString(),
    end_time: task.endTime.toISOString(),
    category: task.category,
    is_completed: task.isCompleted,
    is_fixed: task.isFixed,
    deleted_at: null,
  };
}
