import { describe, expect, it } from 'vitest';

import { createMockTasks, MOCK_ID_PREFIX } from '@/lib/mock-data';
import { GUN } from '@/lib/test-utils';

describe('örnek plan', () => {
  it('kimlikler her çağrıda benzersiz üretilir', () => {
    // Kritik değişmez: kimlikler eskiden `mock-1`..`mock-11` sabitleriydi.
    // `tasks` tablosunun anahtarı yalnızca `id` olduğu için ikinci bir
    // kullanıcı örnek planı yükleyince birincinin satırlarına çarpıyor,
    // RLS reddediyor ve o kullanıcının kendi blokları da kaydedilemiyordu.
    const birinci = createMockTasks(GUN).map((t) => t.id);
    const ikinci = createMockTasks(GUN).map((t) => t.id);

    expect(new Set([...birinci, ...ikinci]).size).toBe(birinci.length + ikinci.length);
  });

  it('kimlikler tek başına sayı değil (eski biçime dönmesin)', () => {
    for (const task of createMockTasks(GUN)) {
      expect(task.id.startsWith(MOCK_ID_PREFIX)).toBe(true);
      expect(/^mock-\d+$/.test(task.id)).toBe(false);
    }
  });

  it('verilen güne yerleşir', () => {
    const tasks = createMockTasks(GUN);
    for (const task of tasks) {
      expect(task.startTime.getFullYear()).toBe(2026);
      expect(task.startTime.getMonth()).toBe(7);
      expect(task.startTime.getDate()).toBe(15);
    }
  });

  it('bitişler başlangıçlardan sonra', () => {
    for (const task of createMockTasks(GUN)) {
      expect(task.endTime.getTime()).toBeGreaterThan(task.startTime.getTime());
    }
  });
});
