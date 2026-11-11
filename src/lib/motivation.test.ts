import { addDays, startOfDay } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { DailyGoal } from '@/lib/goals';
import {
  getDayItems,
  getDayStats,
  getLevel,
  getStreak,
  getTotalXp,
  getWeekInsights,
  type MotivationData,
} from '@/lib/motivation';
import { dayKey } from '@/lib/time';
import type { Task } from '@/types';

const NOW = new Date(2026, 10, 12, 12, 0); // Perşembe
const TODAY = startOfDay(NOW);

const goal = (date: Date, done: boolean, id: string): DailyGoal => ({
  id,
  title: `hedef ${id}`,
  isCompleted: done,
  date: dayKey(date),
  category: 'WORK',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const empty = (): MotivationData => ({
  tasks: [],
  dailyGoals: [],
  routines: [],
  routineCompleted: {},
});

describe('motivasyon hesapları', () => {
  it('günlük hedef ve blokları sayar, tamponu saymaz', () => {
    const data = empty();
    data.dailyGoals = [goal(TODAY, true, 'a'), goal(TODAY, false, 'b')];
    const task = (cat: Task['category'], done: boolean, id: string): Task => ({
      id,
      title: id,
      startTime: new Date(2026, 10, 12, 9),
      endTime: new Date(2026, 10, 12, 10),
      category: cat,
      isCompleted: done,
      isFixed: false,
    });
    data.tasks = [task('WORK', true, 't1'), task('BUFFER', false, 't2')];
    const stats = getDayStats(getDayItems(data, TODAY, TODAY));
    expect(stats).toEqual({ total: 3, completed: 2, rate: 67 });
  });

  it('fix aktivite ve aynı başlıklı takvim bloğunu tek kalem sayar', () => {
    const data = empty();
    data.routines = [
      { id: 'r1', title: 'Spor', category: 'HEALTH', start: 540, duration: 60, days: [4], isFixed: true },
    ];
    data.tasks = [
      {
        id: 't1',
        title: 'spor',
        startTime: new Date(2026, 10, 12, 9),
        endTime: new Date(2026, 10, 12, 10),
        category: 'HEALTH',
        isCompleted: true,
        isFixed: true,
      },
    ];
    const items = getDayItems(data, TODAY, TODAY);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('routine');
    expect(items[0].isCompleted).toBe(true);
  });

  it('geçmiş günlere izsiz rutin için ceza yazmaz', () => {
    const data = empty();
    data.routines = [
      { id: 'r1', title: 'Spor', category: 'HEALTH', start: 540, duration: 60, days: [0, 1, 2, 3, 4, 5, 6], isFixed: true },
    ];
    expect(getDayItems(data, addDays(TODAY, -3), TODAY)).toHaveLength(0);
    data.routineCompleted[dayKey(addDays(TODAY, -3))] = ['r1'];
    expect(getDayItems(data, addDays(TODAY, -3), TODAY)).toHaveLength(1);
  });

  it('seri: bugün bitmediyse dünden sayar', () => {
    const data = empty();
    data.dailyGoals = [
      goal(addDays(TODAY, -1), true, 'y1'),
      goal(addDays(TODAY, -2), true, 'y2'),
      goal(TODAY, false, 'td'),
    ];
    expect(getStreak(data, NOW).current).toBe(2);
  });

  it('seri: bugün de başarılıysa bugünü de sayar, boş gün seriyi keser', () => {
    const data = empty();
    data.dailyGoals = [
      goal(TODAY, true, 'a'),
      goal(addDays(TODAY, -1), true, 'b'),
      goal(addDays(TODAY, -3), true, 'c'),
    ];
    const streak = getStreak(data, NOW);
    expect(streak.current).toBe(2);
    expect(streak.best).toBe(2);
  });

  it('seri yoksa sıfır', () => {
    expect(getStreak(empty(), NOW)).toEqual({ current: 0, best: 0 });
  });

  it('xp ve seviye', () => {
    const data = empty();
    data.dailyGoals = [goal(TODAY, true, 'a'), goal(addDays(TODAY, -1), true, 'b')];
    const xp = getTotalXp(data, NOW);
    expect(xp).toBe(40);
    expect(getLevel(xp).level).toBe(1);
    expect(getLevel(300).level).toBe(3);
  });

  it('boş haftaya net uyarı verir, zayıf kategoriyi söyler', () => {
    const week = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i - 3));
    expect(getWeekInsights(empty(), week, NOW, 0)[0].tone).toBe('bad');

    const data = empty();
    data.dailyGoals = [
      { ...goal(addDays(TODAY, -1), false, 'h1'), category: 'HEALTH' },
      { ...goal(addDays(TODAY, -2), false, 'h2'), category: 'HEALTH' },
      goal(addDays(TODAY, -1), true, 'w1'),
      goal(addDays(TODAY, -2), true, 'w2'),
    ];
    const texts = getWeekInsights(data, week, NOW, 0).map((i) => i.text).join(' ');
    expect(texts).toContain('ihmal');
  });
});
