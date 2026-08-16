import { describe, expect, it } from 'vitest';

import { applyDragPreview, layoutOverlaps, type DragPreview } from '@/lib/layout';
import { gorev } from '@/lib/test-utils';

const onizleme = (
  taskId: string,
  mode: DragPreview['mode'],
  deltaMinutes: number,
): DragPreview => ({ taskId, mode, deltaMinutes });

describe('applyDragPreview', () => {
  const is = gorev('is', '09:00', 60);

  it('önizleme yoksa görevin kendi yerleşimini verir', () => {
    expect(applyDragPreview(is, null)).toEqual({ start: 540, duration: 60 });
  });

  it('başka bir görevin önizlemesini uygulamaz', () => {
    expect(applyDragPreview(is, onizleme('baska', 'move', 60))).toEqual({
      start: 540,
      duration: 60,
    });
  });

  it('taşımada süre korunur', () => {
    expect(applyDragPreview(is, onizleme('is', 'move', 90))).toEqual({
      start: 630,
      duration: 60,
    });
  });

  it('taşımada gün başını aşamaz', () => {
    expect(applyDragPreview(is, onizleme('is', 'move', -600))).toEqual({
      start: 0,
      duration: 60,
    });
  });

  it('taşımada gün sonunu aşamaz — blok tamamen içeride kalır', () => {
    expect(applyDragPreview(is, onizleme('is', 'move', 1000))).toEqual({
      start: 1380, // 23:00, çünkü 60dk sürüyor
      duration: 60,
    });
  });

  it('alt kenar: başlangıç sabit, süre uzar', () => {
    expect(applyDragPreview(is, onizleme('is', 'resize-end', 30))).toEqual({
      start: 540,
      duration: 90,
    });
  });

  it('alt kenar: 15dk altına inemez', () => {
    expect(applyDragPreview(is, onizleme('is', 'resize-end', -300))).toEqual({
      start: 540,
      duration: 15,
    });
  });

  it('alt kenar: gün sonunu aşamaz', () => {
    const gec = gorev('gec', '23:00', 30);
    expect(applyDragPreview(gec, onizleme('gec', 'resize-end', 300))).toEqual({
      start: 1380,
      duration: 60,
    });
  });

  it('üst kenar: BİTİŞ sabit kalır, süre ters yönde değişir', () => {
    // Başlangıç 30dk erkene çekilirse süre 30dk uzar.
    expect(applyDragPreview(is, onizleme('is', 'resize-start', -30))).toEqual({
      start: 510,
      duration: 90,
    });
  });

  it('üst kenar: bitişi geçemez, en az 15dk bırakır', () => {
    expect(applyDragPreview(is, onizleme('is', 'resize-start', 300))).toEqual({
      start: 585, // 09:45
      duration: 15,
    });
  });

  it('sıfır delta hiçbir şeyi değiştirmez', () => {
    expect(applyDragPreview(is, onizleme('is', 'resize-end', 0))).toEqual({
      start: 540,
      duration: 60,
    });
  });
});

describe('layoutOverlaps', () => {
  it('çakışmayan bloklar tek sütun kullanır', () => {
    const sonuc = layoutOverlaps([gorev('a', '09:00', 60), gorev('b', '10:00', 60)]);
    expect(sonuc.map((x) => [x.task.id, x.lane, x.laneCount])).toEqual([
      ['a', 0, 1],
      ['b', 0, 1],
    ]);
  });

  it('uç uca değen bloklar çakışma sayılmaz', () => {
    const sonuc = layoutOverlaps([gorev('a', '09:00', 60), gorev('b', '10:00', 30)]);
    expect(sonuc.every((x) => x.laneCount === 1)).toBe(true);
  });

  it('çakışan iki blok yan yana dizilir', () => {
    const sonuc = layoutOverlaps([gorev('a', '09:00', 60), gorev('b', '09:30', 60)]);
    expect(sonuc.map((x) => [x.task.id, x.lane, x.laneCount])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
    ]);
  });

  it('üç blok üst üste gelirse üç sütun açılır', () => {
    const sonuc = layoutOverlaps([
      gorev('a', '09:00', 120),
      gorev('b', '09:30', 120),
      gorev('c', '10:00', 120),
    ]);
    expect(sonuc.map((x) => x.laneCount)).toEqual([3, 3, 3]);
    expect(sonuc.map((x) => x.lane)).toEqual([0, 1, 2]);
  });

  it('biten sütunu yeniden kullanır', () => {
    // 'c', 'a' bittikten sonra başlıyor → 0. sütuna geri döner.
    const sonuc = layoutOverlaps([
      gorev('a', '09:00', 60),
      gorev('b', '09:30', 120),
      gorev('c', '10:00', 60),
    ]);
    const lane = Object.fromEntries(sonuc.map((x) => [x.task.id, x.lane]));
    expect(lane).toEqual({ a: 0, b: 1, c: 0 });
    expect(sonuc.every((x) => x.laneCount === 2)).toBe(true);
  });

  it('ayrı çakışma kümeleri birbirinin sütun sayısını etkilemez', () => {
    const sonuc = layoutOverlaps([
      gorev('a', '09:00', 60),
      gorev('b', '09:30', 60), // a ile çakışır → küme 1, 2 sütun
      gorev('c', '14:00', 60), // yalnız → küme 2, 1 sütun
    ]);
    const count = Object.fromEntries(sonuc.map((x) => [x.task.id, x.laneCount]));
    expect(count).toEqual({ a: 2, b: 2, c: 1 });
  });

  it('boş liste boş sonuç verir', () => {
    expect(layoutOverlaps([])).toEqual([]);
  });
});
