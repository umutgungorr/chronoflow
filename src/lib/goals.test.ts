import { describe, expect, it } from 'vitest';

import { formatRemaining, getGoalProgress, sortGoals, type Goal } from '@/lib/goals';

const hedef = (id: string, start: string, target: string): Goal => ({
  id,
  title: id,
  startDate: start,
  targetDate: target,
});

// Testler sabit bir "şimdi" kullanıyor: yarın çalıştırıldığında da aynı sonuç.
const SIMDI = new Date(2026, 7, 17, 14, 30);

describe('getGoalProgress', () => {
  it('kalan günü takvim günü olarak sayar (saat farkına takılmaz)', () => {
    // 14:30'dayız ama gün farkı 3; saat 23:59 da olsa 3 demeli.
    const p = getGoalProgress(hedef('a', '2026-08-17', '2026-08-20'), SIMDI);
    expect(p.remainingDays).toBe(3);
  });

  it('başlangıç günü %100 kalmış demektir', () => {
    const p = getGoalProgress(hedef('yks', '2026-08-17', '2027-06-20'), SIMDI);
    expect(p.remainingPercent).toBe(100);
    expect(p.elapsedPercent).toBe(0);
  });

  it('tam ortada %50', () => {
    const p = getGoalProgress(hedef('a', '2026-08-07', '2026-08-27'), SIMDI);
    expect(p.elapsedPercent).toBe(50);
    expect(p.remainingPercent).toBe(50);
  });

  it('hedef günü %0 kalmış', () => {
    const p = getGoalProgress(hedef('a', '2026-08-01', '2026-08-17'), SIMDI);
    expect(p.remainingPercent).toBe(0);
    expect(p.isToday).toBe(true);
    expect(p.isPast).toBe(false);
  });

  it('geçmiş hedefte yüzde 0’ın altına inmez', () => {
    const p = getGoalProgress(hedef('a', '2026-01-01', '2026-08-10'), SIMDI);
    expect(p.isPast).toBe(true);
    expect(p.remainingDays).toBe(-7);
    expect(p.remainingPercent).toBe(0);
    expect(p.elapsedPercent).toBe(100);
  });

  it('başlangıç ileri tarihliyse yüzde 100’ü aşmaz', () => {
    const p = getGoalProgress(hedef('a', '2026-09-01', '2026-10-01'), SIMDI);
    expect(p.remainingPercent).toBe(100);
  });

  it('aynı gün başlayıp biten hedefte sıfıra bölme yok', () => {
    const p = getGoalProgress(hedef('a', '2026-08-17', '2026-08-17'), SIMDI);
    expect(Number.isFinite(p.remainingPercent)).toBe(true);
    expect(p.totalDays).toBe(1);
  });

  it('bozuk tarih uygulamayı düşürmez', () => {
    const p = getGoalProgress(hedef('a', 'abc', '2026-08-20'), SIMDI);
    expect(Number.isFinite(p.remainingPercent)).toBe(true);
  });
});

describe('formatRemaining', () => {
  const bicim = (start: string, target: string) =>
    formatRemaining(getGoalProgress(hedef('a', start, target), SIMDI));

  it('gelecek hedefte gün sayısı', () => {
    expect(bicim('2026-08-17', '2026-08-20')).toBe('3 gün');
  });

  it('bugünse "bugün"', () => {
    expect(bicim('2026-08-01', '2026-08-17')).toBe('bugün');
  });

  it('geçmişse kaç gün geçtiğini söyler', () => {
    expect(bicim('2026-01-01', '2026-08-10')).toBe('7 gün geçti');
  });
});

describe('sortGoals', () => {
  it('yaklaşan önce, geçmiş en sona', () => {
    const goals = [
      hedef('uzak', '2026-08-17', '2027-06-20'),
      hedef('gecmis', '2026-01-01', '2026-08-10'),
      hedef('yakin', '2026-08-17', '2026-08-20'),
    ];
    expect(sortGoals(goals, SIMDI).map((g) => g.id)).toEqual(['yakin', 'uzak', 'gecmis']);
  });
});
