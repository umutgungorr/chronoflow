import { describe, expect, it } from 'vitest';

import {
  findFreeSlots,
  getAvailableDuration,
  getBookedMinutes,
  reflow,
  sortByStart,
  withDuration,
  withStartMinutes,
} from '@/lib/scheduler';
import { GUN, gorev, harita } from '@/lib/test-utils';

describe('reflow — tampon algoritması', () => {
  it('çakışma yoksa hiçbir şeye dokunmaz', () => {
    const tasks = [gorev('a', '09:00', 60), gorev('b', '11:00', 60)];
    const sonuc = reflow(tasks, 'a');

    expect(harita(sonuc.tasks)).toEqual({ a: '09:00-10:00', b: '11:00-12:00' });
    expect(sonuc.shiftedTaskIds).toEqual([]);
    expect(sonuc.absorbedBufferIds).toEqual([]);
    expect(sonuc.conflict).toBeNull();
  });

  it('tampon darbeyi emer: kısalır, sonraki bloklar yerinde kalır', () => {
    // 09:00-11:30'a uzamış iş, 11:00-12:00 tamponunun 30dk'sını yer.
    const tasks = [
      gorev('is', '09:00', 150),
      gorev('tampon', '11:00', 60, { category: 'BUFFER' }),
      gorev('sonraki', '12:00', 60),
    ];
    const sonuc = reflow(tasks, 'is');

    expect(harita(sonuc.tasks)).toEqual({
      is: '09:00-11:30',
      tampon: '11:30-12:00',
      sonraki: '12:00-13:00',
    });
    expect(sonuc.absorbedBufferIds).toEqual(['tampon']);
    expect(sonuc.shiftedTaskIds).toEqual([]);
    expect(sonuc.conflict).toBeNull();
  });

  it('tampon tamamen tükenirse silinir ve kalan taşma devreder', () => {
    // Taşma 45dk; 30dk'lık tampon yetmiyor, geriye 15dk kalıyor.
    const tasks = [
      gorev('is', '09:00', 165),
      gorev('tampon', '11:00', 30, { category: 'BUFFER' }),
      gorev('sonraki', '11:30', 60),
    ];
    const sonuc = reflow(tasks, 'is');

    expect(sonuc.tasks.map((t) => t.id)).not.toContain('tampon');
    expect(harita(sonuc.tasks)).toEqual({ is: '09:00-11:45', sonraki: '11:45-12:45' });
    expect(sonuc.absorbedBufferIds).toEqual(['tampon']);
    expect(sonuc.shiftedTaskIds).toEqual(['sonraki']);
  });

  it('tampon 15dk altına düşecekse tamamen tüketilir (yarım blok bırakmaz)', () => {
    // Taşma 20dk değil 15'in katı olmalı; 30dk tampondan 20 yenirse 10 kalırdı.
    const tasks = [
      gorev('is', '09:00', 140), // 11:20 — snap dışı, bilerek
      gorev('tampon', '11:00', 30, { category: 'BUFFER' }),
    ];
    const sonuc = reflow(tasks, 'is');

    expect(sonuc.tasks.map((t) => t.id)).not.toContain('tampon');
    expect(sonuc.absorbedBufferIds).toEqual(['tampon']);
  });

  it('sabit görev zinciri kırar ve çakışmayı raporlar', () => {
    const tasks = [
      gorev('is', '09:00', 180), // 12:00'a kadar
      gorev('toplanti', '11:30', 60, { isFixed: true, title: 'Ekip toplantısı' }),
    ];
    const sonuc = reflow(tasks, 'is');

    expect(harita(sonuc.tasks)).toEqual({ is: '09:00-12:00', toplanti: '11:30-12:30' });
    expect(sonuc.conflict).toContain('Ekip toplantısı');
    expect(sonuc.conflict).toContain('30 dakika');
    expect(sonuc.shiftedTaskIds).toEqual([]);
  });

  it('araya boşluk girdiğinde zincir durur', () => {
    // 'orta' 30dk kayıyor ama 'uzak' ile arada boşluk kaldığı için o kaymıyor.
    const tasks = [
      gorev('is', '09:00', 90),
      gorev('orta', '10:00', 30),
      gorev('uzak', '14:00', 60),
    ];
    const sonuc = reflow(tasks, 'is');

    expect(harita(sonuc.tasks)).toEqual({
      is: '09:00-10:30',
      orta: '10:30-11:00',
      uzak: '14:00-15:00',
    });
    expect(sonuc.shiftedTaskIds).toEqual(['orta']);
  });

  it('zincirleme kaydırır: birden çok blok sırayla iter', () => {
    const tasks = [
      gorev('is', '09:00', 90),
      gorev('b1', '10:00', 60),
      gorev('b2', '11:00', 60),
    ];
    const sonuc = reflow(tasks, 'is');

    expect(harita(sonuc.tasks)).toEqual({
      is: '09:00-10:30',
      b1: '10:30-11:30',
      b2: '11:30-12:30',
    });
    expect(sonuc.shiftedTaskIds).toEqual(['b1', 'b2']);
  });

  it('başka günün blokları etkilenmez', () => {
    const yarin = gorev('yarin', '09:00', 60);
    yarin.startTime = new Date(2026, 7, 16, 9, 0);
    yarin.endTime = new Date(2026, 7, 16, 10, 0);

    const tasks = [gorev('is', '09:00', 120), gorev('bugun', '10:00', 60), yarin];
    const sonuc = reflow(tasks, 'is');

    const yarinSonuc = sonuc.tasks.find((t) => t.id === 'yarin')!;
    expect(yarinSonuc.startTime.getDate()).toBe(16);
    expect(yarinSonuc.startTime.getHours()).toBe(9);
  });

  it('bilinmeyen çapa id gelirse listeyi olduğu gibi döndürür', () => {
    const tasks = [gorev('a', '09:00', 60)];
    const sonuc = reflow(tasks, 'olmayan');
    expect(sonuc.tasks).toBe(tasks);
    expect(sonuc.conflict).toBeNull();
  });
});

describe('findFreeSlots', () => {
  it('boş günde tek bir aralık verir', () => {
    expect(findFreeSlots([], GUN)).toEqual([{ start: 0, end: 1440, duration: 1440 }]);
  });

  it('bloklar arasındaki boşlukları bulur', () => {
    const tasks = [gorev('a', '09:00', 60), gorev('b', '13:00', 60)];
    const slots = findFreeSlots(tasks, GUN, { from: 8 * 60, to: 18 * 60 });

    expect(slots).toEqual([
      { start: 480, end: 540, duration: 60 }, // 08:00-09:00
      { start: 600, end: 780, duration: 180 }, // 10:00-13:00
      { start: 840, end: 1080, duration: 240 }, // 14:00-18:00
    ]);
  });

  it('minDuration altındaki boşlukları eler', () => {
    const tasks = [gorev('a', '09:00', 60), gorev('b', '10:15', 60)];
    const slots = findFreeSlots(tasks, GUN, { from: 9 * 60, to: 12 * 60, minDuration: 30 });

    // 10:00-10:15 aralığı 15dk olduğu için listede olmamalı.
    expect(slots).toEqual([{ start: 675, end: 720, duration: 45 }]);
  });

  it('tamponlar da yer kaplar (otomatik yerleştirme üstüne yazmasın)', () => {
    const tasks = [gorev('tampon', '10:00', 60, { category: 'BUFFER' })];
    const slots = findFreeSlots(tasks, GUN, { from: 9 * 60, to: 12 * 60 });

    expect(slots).toEqual([
      { start: 540, end: 600, duration: 60 },
      { start: 660, end: 720, duration: 60 },
    ]);
  });

  it('iç içe geçmiş blokları tek dolu alan sayar', () => {
    const tasks = [gorev('uzun', '09:00', 180), gorev('kisa', '10:00', 30)];
    const slots = findFreeSlots(tasks, GUN, { from: 9 * 60, to: 13 * 60 });

    expect(slots).toEqual([{ start: 720, end: 780, duration: 60 }]);
  });
});

describe('getAvailableDuration', () => {
  it('sonraki bloğa kadar kırpar', () => {
    const tasks = [gorev('a', '10:00', 60)];
    expect(getAvailableDuration(tasks, GUN, 9 * 60, 120)).toBe(60);
  });

  it('boşluk yeterliyse tercih edilen süreyi verir', () => {
    const tasks = [gorev('a', '12:00', 60)];
    expect(getAvailableDuration(tasks, GUN, 9 * 60, 60)).toBe(60);
  });

  it('gün sonunu aşmaz', () => {
    expect(getAvailableDuration([], GUN, 23 * 60 + 30, 60)).toBe(30);
  });

  it('hiç yer yoksa bile en az 15dk döner', () => {
    const tasks = [gorev('a', '09:00', 60)];
    expect(getAvailableDuration(tasks, GUN, 9 * 60, 60)).toBe(15);
  });
});

describe('yardımcılar', () => {
  it('sortByStart başlangıca, eşitlikte bitişe göre sıralar', () => {
    const tasks = [gorev('gec', '11:00', 60), gorev('uzun', '09:00', 120), gorev('kisa', '09:00', 30)];
    expect(sortByStart(tasks).map((t) => t.id)).toEqual(['kisa', 'uzun', 'gec']);
  });

  it('withStartMinutes süreyi korur', () => {
    const sonuc = withStartMinutes(gorev('a', '09:00', 90), 13 * 60);
    expect(harita([sonuc])).toEqual({ a: '13:00-14:30' });
  });

  it('withDuration başlangıcı korur ve 15dk altına inmez', () => {
    expect(harita([withDuration(gorev('a', '09:00', 60), 5)])).toEqual({ a: '09:00-09:15' });
  });

  it('getBookedMinutes tamponları saymaz', () => {
    const tasks = [gorev('a', '09:00', 60), gorev('t', '10:00', 30, { category: 'BUFFER' })];
    expect(getBookedMinutes(tasks, GUN)).toBe(60);
  });
});
