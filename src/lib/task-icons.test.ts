import { describe, expect, it } from 'vitest';

import { resolveTaskIconId, TASK_ICON_CATALOG } from '@/lib/task-icons';

describe('task-icons akıllı ders/aktivite eşleştirici', () => {
  it('ders ve çalışma başlıklarını doğru Notion imgesine eşler', () => {
    expect(resolveTaskIconId('Paragraf', 'WORK')).toBe('book-open');
    expect(resolveTaskIconId('Coğrafya Dağlar Zemin Hazırlama', 'WORK')).toBe('globe');
    expect(resolveTaskIconId('Mat Basit Eşitsizlikler', 'WORK')).toBe('sigma');
    expect(resolveTaskIconId('MOLA', 'BUFFER')).toBe('coffee');
    expect(resolveTaskIconId('Fizik Optik', 'WORK')).toBe('atom');
    expect(resolveTaskIconId('Kimya Organik', 'WORK')).toBe('flask');
    expect(resolveTaskIconId('Biyoloji Hücre', 'WORK')).toBe('dna');
    expect(resolveTaskIconId('Tarih İnkılap', 'WORK')).toBe('landmark');
    expect(resolveTaskIconId('Geometri Üçgenler', 'WORK')).toBe('compass');
    expect(resolveTaskIconId('TYT Deneme', 'WORK')).toBe('file-check');
    expect(resolveTaskIconId('İngilizce Kelime', 'WORK')).toBe('languages');
    expect(resolveTaskIconId('React Kodlama', 'WORK')).toBe('code');
  });

  it('özel ikon seçildiğinde otomatik algılamayı ezer', () => {
    expect(resolveTaskIconId('Paragraf', 'WORK', 'flame')).toBe('flame');
    expect(resolveTaskIconId('Mat Basit Eşitsizlikler', 'WORK', 'mountain')).toBe('mountain');
  });

  it('katalog en az 30 benzersiz imge içerir', () => {
    const ids = new Set(TASK_ICON_CATALOG.map((item) => item.id));
    expect(ids.size).toBeGreaterThanOrEqual(30);
  });
});
