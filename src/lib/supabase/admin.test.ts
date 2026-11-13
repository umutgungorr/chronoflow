import { describe, expect, it } from 'vitest';

import { dedupeVisits, describeUserAgent, type VisitRow } from '@/lib/supabase/admin';

function makeVisit(overrides: Partial<VisitRow> = {}): VisitRow {
  return {
    id: 1,
    occurredAt: '2026-11-13T21:10:00+03:00',
    userId: 'user-1',
    ip: '104.28.244.150',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0.0.0',
    path: '/',
    referer: null,
    ...overrides,
  };
}

describe('dedupeVisits', () => {
  it('aynı kişinin arka arkaya sayfa gezintilerini tek ziyarete indirir', () => {
    const visits: VisitRow[] = [
      makeVisit({ id: 1, occurredAt: '2026-11-13T20:33:00+03:00', path: '/motivasyon' }),
      makeVisit({ id: 2, occurredAt: '2026-11-13T20:37:00+03:00', path: '/' }),
      makeVisit({ id: 3, occurredAt: '2026-11-13T21:06:00+03:00', path: '/hedefler' }),
      makeVisit({ id: 4, occurredAt: '2026-11-13T21:10:00+03:00', path: '/hedefler' }),
    ];

    const deduped = dedupeVisits(visits);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.id).toBe(4);
  });

  it('aradan 1 saatten fazla geçmişse ayrı ziyaret olarak korur', () => {
    const visits: VisitRow[] = [
      makeVisit({ id: 1, occurredAt: '2026-11-13T14:00:00+03:00' }),
      makeVisit({ id: 2, occurredAt: '2026-11-13T21:10:00+03:00' }),
    ];

    const deduped = dedupeVisits(visits);

    expect(deduped.map((v) => v.id)).toEqual([2, 1]);
  });

  it('farklı kullanıcı veya cihazları aynı dakikada olsa bile ayırır', () => {
    const visits: VisitRow[] = [
      makeVisit({ id: 1, userId: 'user-1' }),
      makeVisit({ id: 2, userId: 'user-2', ip: '10.0.0.2' }),
      makeVisit({
        id: 3,
        userId: 'user-1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1',
      }),
    ];

    const deduped = dedupeVisits(visits);

    expect(deduped).toHaveLength(3);
  });
});

describe('describeUserAgent', () => {
  it('tarayıcı ve işletim sistemini sadeleştirir', () => {
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/130.0.0.0')).toBe(
      'Chrome · Windows',
    );
  });
});
