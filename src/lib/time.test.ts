import { describe, expect, it } from 'vitest';

import { PX_PER_MINUTE, SLOT_HEIGHT_PX } from '@/lib/constants';
import {
  clampStart,
  clampToDay,
  formatDuration,
  formatRange,
  fromDayMinutes,
  getDurationMinutes,
  isTaskOnDay,
  minutesToY,
  snapMinutes,
  tasksOverlap,
  toDayMinutes,
  yToMinutes,
  yToSnappedMinutes,
} from '@/lib/time';
import { GUN, gorev } from '@/lib/test-utils';

describe('snapMinutes', () => {
  it('en yakın 15 dakikaya yuvarlar', () => {
    expect(snapMinutes(0)).toBe(0);
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(22)).toBe(15);
    expect(snapMinutes(23)).toBe(30);
    expect(snapMinutes(60)).toBe(60);
  });

  it('negatif değerlerde de çalışır (yukarı sürükleme)', () => {
    expect(snapMinutes(-7)).toBe(-0);
    expect(snapMinutes(-8)).toBe(-15);
  });
});

describe('sınırlama', () => {
  it('clampToDay gün dışına çıkmaz', () => {
    expect(clampToDay(-60)).toBe(0);
    expect(clampToDay(2000)).toBe(1440);
    expect(clampToDay(600)).toBe(600);
  });

  it('clampStart bloğun tamamını gün içinde tutar', () => {
    expect(clampStart(1400, 60)).toBe(1380); // 23:00'te başlamalı
    expect(clampStart(-30, 60)).toBe(0);
    expect(clampStart(600, 60)).toBe(600);
  });
});

describe('piksel ↔ dakika', () => {
  it('bir dilim tam SLOT_HEIGHT_PX yüksekliğindedir', () => {
    expect(minutesToY(15)).toBe(SLOT_HEIGHT_PX);
    expect(minutesToY(60)).toBe(SLOT_HEIGHT_PX * 4);
  });

  it('gün sonu ızgara yüksekliğine denk gelir', () => {
    expect(minutesToY(1440)).toBe(1440 * PX_PER_MINUTE);
  });

  it('yToMinutes minutesToY işlemini geri alır', () => {
    for (const dakika of [0, 15, 90, 540, 1425]) {
      expect(yToMinutes(minutesToY(dakika))).toBeCloseTo(dakika, 6);
    }
  });

  it('yToSnappedMinutes ızgaraya yapıştırır ve günde tutar', () => {
    expect(yToSnappedMinutes(minutesToY(547))).toBe(540); // 09:07 → 09:00
    expect(yToSnappedMinutes(minutesToY(548))).toBe(555); // 09:08 → 09:15
    expect(yToSnappedMinutes(-500)).toBe(0);
    expect(yToSnappedMinutes(999999)).toBe(1440);
  });
});

describe('görev yardımcıları', () => {
  it('toDayMinutes / fromDayMinutes birbirinin tersi', () => {
    expect(toDayMinutes(fromDayMinutes(GUN, 555))).toBe(555);
  });

  it('getDurationMinutes süreyi verir ve 15dk altına inmez', () => {
    expect(getDurationMinutes(gorev('a', '09:00', 90))).toBe(90);
    expect(getDurationMinutes(gorev('a', '09:00', 5))).toBe(15);
  });

  it('tasksOverlap uç uca değmeyi çakışma saymaz', () => {
    const a = gorev('a', '09:00', 60);
    expect(tasksOverlap(a, gorev('b', '10:00', 60))).toBe(false);
    expect(tasksOverlap(a, gorev('b', '09:59', 60))).toBe(true);
    expect(tasksOverlap(a, gorev('b', '08:00', 60))).toBe(false);
  });

  it('isTaskOnDay günü doğru eşler', () => {
    expect(isTaskOnDay(gorev('a', '09:00', 60), GUN)).toBe(true);
    expect(isTaskOnDay(gorev('a', '09:00', 60), new Date(2026, 7, 16))).toBe(false);
  });

  it('gece yarısına kadar süren blok o güne aittir', () => {
    expect(isTaskOnDay(gorev('gec', '23:00', 60), GUN)).toBe(true);
  });
});

describe('biçimlendirme', () => {
  it('formatDuration okunur çıktı verir', () => {
    expect(formatDuration(45)).toBe('45dk');
    expect(formatDuration(60)).toBe('1s');
    expect(formatDuration(90)).toBe('1s 30dk');
    expect(formatDuration(120)).toBe('2s');
    expect(formatDuration(0)).toBe('0dk');
  });

  it('formatRange saat aralığı verir', () => {
    expect(formatRange(gorev('a', '09:00', 90))).toBe('09:00 – 10:30');
  });
});
