import { describe, expect, it } from 'vitest';

import { parseSchedulePrompt, planIntoDay } from '@/lib/magic-schedule';
import { GUN, gorev } from '@/lib/test-utils';

describe('parseSchedulePrompt — süre', () => {
  it('saat okur', () => {
    expect(parseSchedulePrompt('2 saat kod')[0].duration).toBe(120);
  });

  it('dakika okur', () => {
    expect(parseSchedulePrompt('30 dk kitap')[0].duration).toBe(30);
  });

  it('saat ve dakikayı toplar', () => {
    expect(parseSchedulePrompt('1 saat 30 dakika ders')[0].duration).toBe(90);
  });

  it('"buçuk" ekler', () => {
    expect(parseSchedulePrompt('bir buçuk saat proje')[0].duration).toBe(90);
  });

  it('"yarım saat" 30 dakikadır', () => {
    expect(parseSchedulePrompt('yarım saat mola')[0].duration).toBe(30);
  });

  it('yazıyla sayı okur', () => {
    expect(parseSchedulePrompt('üç saat çalışma')[0].duration).toBe(180);
  });

  it('ondalık kabul eder', () => {
    expect(parseSchedulePrompt('1,5 saat spor')[0].duration).toBe(90);
  });

  it('süre yoksa 1 saat varsayar', () => {
    expect(parseSchedulePrompt('market alışverişi')[0].duration).toBe(60);
  });

  it('süreyi 15dk ızgarasına yuvarlar', () => {
    expect(parseSchedulePrompt('20 dk koşu')[0].duration).toBe(15);
    expect(parseSchedulePrompt('25 dk koşu')[0].duration).toBe(30);
  });
});

describe('parseSchedulePrompt — kategori', () => {
  const kategori = (metin: string) => parseSchedulePrompt(metin)[0].category;

  it('iş kelimelerini tanır', () => {
    expect(kategori('2 saat kod yazacağım')).toBe('WORK');
    expect(kategori('1 saat ders çalışacağım')).toBe('WORK');
  });

  it('spor kelimelerini tanır', () => {
    expect(kategori('1 saat spor yapacağım')).toBe('HEALTH');
    expect(kategori('30 dk yürüyüş')).toBe('HEALTH');
  });

  it('sosyal kelimelerini tanır', () => {
    expect(kategori('30 dk kitap okuyacağım')).toBe('SOCIAL');
    expect(kategori('2 saat film')).toBe('SOCIAL');
  });

  it('rutin kelimelerini tanır', () => {
    expect(kategori('1 saat yemek')).toBe('ROUTINE');
  });

  it('acil kelimeleri diğerlerini geçer', () => {
    // "fatura" hem acil hem başka bir şey olabilir; ACİL öncelikli olmalı.
    expect(kategori('30 dk fatura ödemesi')).toBe('URGENT');
  });

  it('tanımadığında işe düşer', () => {
    expect(kategori('1 saat zeplin')).toBe('WORK');
  });
});

describe('parseSchedulePrompt — başlık ve zaman tercihi', () => {
  it('süreyi ve fiili başlıktan atar', () => {
    expect(parseSchedulePrompt('2 saat kod yazacağım')[0].title).toBe('Kod');
  });

  it('"bugün" gibi dolgu kelimelerini atar', () => {
    expect(parseSchedulePrompt('bugün 1 saat spor yapacağım')[0].title).toBe('Spor');
  });

  it('günün bölümünü yakalar ve başlıktan çıkarır', () => {
    const [madde] = parseSchedulePrompt('akşam 30 dk kitap okuyacağım');
    expect(madde.dayPart).toBe('aksam');
    expect(madde.title).toBe('Kitap');
  });

  it('zaman tercihi yoksa null', () => {
    expect(parseSchedulePrompt('2 saat kod')[0].dayPart).toBeNull();
  });

  it('başlık boş kalırsa "Blok" der', () => {
    expect(parseSchedulePrompt('2 saat')[0].title).toBe('Blok');
  });
});

describe('parseSchedulePrompt — bölme', () => {
  it('virgülle ayırır', () => {
    const maddeler = parseSchedulePrompt('2 saat kod, 1 saat spor, 30 dk kitap');
    expect(maddeler.map((m) => [m.title, m.duration])).toEqual([
      ['Kod', 120],
      ['Spor', 60],
      ['Kitap', 30],
    ]);
  });

  it('"ve" ile ayırır', () => {
    expect(parseSchedulePrompt('1 saat spor ve 1 saat kod')).toHaveLength(2);
  });

  it('boş metin boş liste verir', () => {
    expect(parseSchedulePrompt('')).toEqual([]);
    expect(parseSchedulePrompt('   ')).toEqual([]);
  });
});

describe('planIntoDay', () => {
  const secenekler = { from: 8 * 60, to: 24 * 60, withBuffers: false };

  it('boş güne sırayla yerleştirir', () => {
    const maddeler = parseSchedulePrompt('2 saat kod, 1 saat spor');
    const { blocks, skipped } = planIntoDay([], GUN, maddeler, secenekler);

    expect(blocks.map((b) => [b.title, b.start, b.duration])).toEqual([
      ['Kod', 480, 120],
      ['Spor', 600, 60],
    ]);
    expect(skipped).toEqual([]);
  });

  it('araya tampon koyar', () => {
    const maddeler = parseSchedulePrompt('1 saat kod, 1 saat spor');
    const { blocks } = planIntoDay([], GUN, maddeler, { ...secenekler, withBuffers: true });

    expect(blocks.map((b) => [b.title, b.start, b.duration])).toEqual([
      ['Kod', 480, 60],
      ['Tampon', 540, 15],
      ['Spor', 555, 60],
      ['Tampon', 615, 15],
    ]);
  });

  it('dolu saatlerin üstüne yazmaz', () => {
    const mevcut = [gorev('toplanti', '08:00', 120)];
    const { blocks } = planIntoDay([], GUN, parseSchedulePrompt('1 saat kod'), {
      ...secenekler,
    });
    expect(blocks[0].start).toBe(480);

    const { blocks: b2 } = planIntoDay(mevcut, GUN, parseSchedulePrompt('1 saat kod'), {
      ...secenekler,
    });
    expect(b2[0].start).toBe(600); // 10:00, toplantıdan sonra
  });

  it('"akşam" tercihini önce dener', () => {
    const maddeler = parseSchedulePrompt('akşam 30 dk kitap');
    const { blocks } = planIntoDay([], GUN, maddeler, secenekler);
    expect(blocks[0].start).toBe(18 * 60);
  });

  it('tercih edilen pencere doluysa günün kalanına düşer', () => {
    const dolu = [gorev('mesgul', '18:00', 6 * 60)]; // tüm akşam dolu
    const maddeler = parseSchedulePrompt('akşam 30 dk kitap');
    const { blocks } = planIntoDay(dolu, GUN, maddeler, secenekler);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toBe(480); // sabaha düştü
  });

  it('güne sığmayanı atlar ve raporlar', () => {
    const maddeler = parseSchedulePrompt('3 saat proje');
    const { blocks, skipped } = planIntoDay([], GUN, maddeler, {
      from: 22 * 60,
      to: 24 * 60,
      withBuffers: false,
    });

    expect(blocks).toEqual([]);
    expect(skipped.map((s) => s.title)).toEqual(['Proje']);
  });

  it('yerleştirdiğini bir sonraki madde için dolu sayar', () => {
    const maddeler = parseSchedulePrompt('1 saat a, 1 saat b, 1 saat c');
    const { blocks } = planIntoDay([], GUN, maddeler, secenekler);
    const baslangiclar = blocks.map((b) => b.start);
    expect(baslangiclar).toEqual([480, 540, 600]);
  });
});
