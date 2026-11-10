import { describe, expect, it } from 'vitest';

import { summarizeDay, localReview } from '@/lib/day-review';
import {
  findActiveTask,
  formatClock,
  pomodoroAt,
  tasksToNotify,
  POMODORO_BREAK_SECONDS,
  POMODORO_FOCUS_SECONDS,
} from '@/lib/focus';
import { sanitizeScheduleItems } from '@/lib/magic-schedule';
import {
  DAY_TEMPLATES,
  placeBlocks,
  planRoutinesIntoDay,
  planTemplateIntoDay,
  routinesForDay,
  type Routine,
} from '@/lib/routines';
import { GUN, gorev } from '@/lib/test-utils';

let n = 0;
const id = () => `id-${++n}`;

// GUN = 15 Ağustos 2026, Cumartesi (getDay() === 6).
const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'r1',
  title: 'Spor',
  category: 'HEALTH',
  start: 7 * 60,
  duration: 60,
  days: [6],
  isFixed: false,
  ...over,
});

describe('rutinler', () => {
  it('yalnızca ilgili haftanın günü için geçerlidir', () => {
    expect(routinesForDay([routine({ days: [1] })], GUN)).toHaveLength(0);
    expect(routinesForDay([routine({ days: [6] })], GUN)).toHaveLength(1);
  });

  it('boş güne yerleşir', () => {
    const { created, handledIds } = planRoutinesIntoDay([], [routine()], GUN, [], id);
    expect(created).toHaveLength(1);
    expect(created[0]!.startTime.getHours()).toBe(7);
    expect(handledIds).toEqual(['r1']);
  });

  it('aynı gün ikinci kez uygulanmaz', () => {
    const { created, handledIds } = planRoutinesIntoDay([], [routine()], GUN, ['r1'], id);
    expect(created).toHaveLength(0);
    expect(handledIds).toHaveLength(0);
  });

  it('mevcut blokla çakışırsa atlar ama işlenmiş sayar', () => {
    const { created, handledIds } = planRoutinesIntoDay(
      [gorev('a', '07:30', 60)],
      [routine()],
      GUN,
      [],
      id,
    );
    expect(created).toHaveLength(0);
    expect(handledIds).toEqual(['r1']);
  });

  it('birbiriyle çakışan iki rutinden yalnızca ilki yerleşir', () => {
    const { created } = planRoutinesIntoDay(
      [],
      [routine({ id: 'a' }), routine({ id: 'b', title: 'Kahvaltı', start: 7 * 60 + 30 })],
      GUN,
      [],
      id,
    );
    expect(created).toHaveLength(1);
  });
});

describe('şablonlar', () => {
  it('hiçbir şablon kendi içinde çakışmaz', () => {
    for (const template of DAY_TEMPLATES) {
      const { created, skipped } = placeBlocks([], GUN, template.blocks, id);
      expect(skipped, template.name).toBe(0);
      expect(created).toHaveLength(template.blocks.length);
    }
  });

  it('mevcut blokları ezmeden çakışanı atlar', () => {
    const template = DAY_TEMPLATES[0]!;
    const first = template.blocks[0]!;
    const existing = gorev('x', `${String(Math.floor(first.start / 60)).padStart(2, '0')}:00`, 60);
    const { created, skipped } = planTemplateIntoDay([existing], GUN, template, id);
    expect(skipped).toBeGreaterThan(0);
    expect(created.length + skipped).toBe(template.blocks.length);
  });
});

describe('AI çıktısı doğrulama', () => {
  it('geçersiz girdiyi boş liste yapar', () => {
    expect(sanitizeScheduleItems(null)).toEqual([]);
    expect(sanitizeScheduleItems('x')).toEqual([]);
    expect(sanitizeScheduleItems([{ title: '', duration: 30 }, 5, null])).toEqual([]);
  });

  it('süreyi 15dk ızgarasına yuvarlar ve sınırlar', () => {
    const items = sanitizeScheduleItems([
      { title: 'A', duration: 50, category: 'WORK' },
      { title: 'B', duration: 1, category: 'WORK' },
      { title: 'C', duration: 99999, category: 'WORK' },
    ]);
    expect(items.map((i) => i.duration)).toEqual([45, 15, 720]);
  });

  it('bilinmeyen kategoriyi WORK, tamponu ROUTINE yapar; dayPart doğrulanır', () => {
    const items = sanitizeScheduleItems([
      { title: 'A', duration: 30, category: 'HACK' },
      { title: 'B', duration: 30, category: 'BUFFER', dayPart: 'aksam' },
      { title: 'C', duration: 30, category: 'WORK', dayPart: 'gece' },
    ]);
    expect(items[0]!.category).toBe('WORK');
    expect(items[1]!.category).toBe('ROUTINE');
    expect(items[1]!.dayPart).toBe('aksam');
    expect(items[2]!.dayPart).toBeNull();
  });

  it('en fazla 20 madde alır', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ title: `T${i}`, duration: 30, category: 'WORK' }));
    expect(sanitizeScheduleItems(many)).toHaveLength(20);
  });
});

describe('gün değerlendirmesi', () => {
  it('tamponu saymaz, oranı hesaplar', () => {
    const tasks = [
      gorev('a', '09:00', 60, { isCompleted: true }),
      gorev('b', '10:00', 60),
      gorev('c', '11:00', 30, { category: 'BUFFER' }),
    ];
    const s = summarizeDay(tasks, GUN);
    expect(s.taskCount).toBe(2);
    expect(s.completionRate).toBe(50);
    expect(s.openTitles).toEqual(['b']);
  });

  it('boş gün için yönlendirici metin verir', () => {
    expect(localReview(summarizeDay([], GUN))).toMatch(/blok koymamışsın/);
  });
});

describe('odak modu', () => {
  const at = (h: number, m = 0) => new Date(2026, 7, 15, h, m);

  it('süren bloğu bulur, tamponu yok sayar', () => {
    const tasks = [gorev('a', '09:00', 60), gorev('buf', '09:00', 60, { category: 'BUFFER' })];
    expect(findActiveTask(tasks, at(9, 30))?.id).toBe('a');
    expect(findActiveTask(tasks, at(10, 0))).toBeNull();
  });

  it('saat biçimi', () => {
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-5)).toBe('00:00');
  });

  it('pomodoro odak → mola → yeni tur döner', () => {
    expect(pomodoroAt(0)).toMatchObject({ phase: 'focus', cycle: 1, remaining: POMODORO_FOCUS_SECONDS });
    expect(pomodoroAt(POMODORO_FOCUS_SECONDS)).toMatchObject({ phase: 'break', remaining: POMODORO_BREAK_SECONDS });
    expect(pomodoroAt(POMODORO_FOCUS_SECONDS + POMODORO_BREAK_SECONDS)).toMatchObject({ phase: 'focus', cycle: 2 });
  });

  it('bildirim: 5 dk içinde başlayacak, haber verilmemiş blok', () => {
    const tasks = [gorev('a', '09:03', 30), gorev('b', '09:30', 30), gorev('c', '09:02', 30, { isCompleted: true })];
    expect(tasksToNotify(tasks, at(9, 0), new Set()).map((t) => t.id)).toEqual(['a']);
    expect(tasksToNotify(tasks, at(9, 0), new Set(['a']))).toHaveLength(0);
    // Başlamış blok için bildirim yok.
    expect(tasksToNotify(tasks, at(9, 10), new Set())).toHaveLength(0);
  });
});
