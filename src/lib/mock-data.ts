import { startOfDay } from 'date-fns';

import { fromDayMinutes } from '@/lib/time';
import type { Task, TaskCategory } from '@/types';

type MockSeed = {
  title: string;
  description?: string;
  /** "HH:mm" */
  start: string;
  /** dakika */
  duration: number;
  category: TaskCategory;
  isFixed?: boolean;
  isCompleted?: boolean;
};

const SEEDS: MockSeed[] = [
  { title: 'Sabah rutini & kahvaltı', start: '07:00', duration: 60, category: 'ROUTINE', isCompleted: true },
  { title: 'Spor — koşu', start: '08:00', duration: 45, category: 'HEALTH', isCompleted: true },
  { title: 'Derin çalışma: ChronoFlow', description: 'Timeline grid + dnd mimarisi', start: '09:00', duration: 120, category: 'WORK' },
  { title: 'Tampon', start: '11:00', duration: 30, category: 'BUFFER' },
  { title: 'Ekip toplantısı', description: 'Haftalık sync — ertelenemez', start: '11:30', duration: 60, category: 'WORK', isFixed: true },
  { title: 'Öğle yemeği', start: '12:30', duration: 45, category: 'ROUTINE' },
  { title: 'Kod incelemesi', start: '14:00', duration: 90, category: 'WORK' },
  { title: 'Tampon', start: '15:30', duration: 45, category: 'BUFFER' },
  { title: 'Fatura son ödeme günü', start: '16:30', duration: 30, category: 'URGENT' },
  { title: 'Kitap okuma', start: '18:00', duration: 60, category: 'SOCIAL' },
  { title: 'Akşam yürüyüşü', start: '20:00', duration: 30, category: 'HEALTH' },
];

function parseHHmm(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Verilen gün için sahte görev listesi üretir.
 * Supabase bağlanana kadar store'un başlangıç verisi budur.
 */
export function createMockTasks(day: Date = new Date()): Task[] {
  const base = startOfDay(day);
  return SEEDS.map((seed, index) => {
    const startMinutes = parseHHmm(seed.start);
    return {
      // Deterministik id: SSR/CSR arasında farklılık yaratmaması için random yok.
      id: `mock-${index + 1}`,
      title: seed.title,
      description: seed.description,
      startTime: fromDayMinutes(base, startMinutes),
      endTime: fromDayMinutes(base, startMinutes + seed.duration),
      category: seed.category,
      isCompleted: seed.isCompleted ?? false,
      isFixed: seed.isFixed ?? false,
    } satisfies Task;
  });
}
