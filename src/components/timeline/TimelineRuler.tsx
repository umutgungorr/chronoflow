'use client';

import { useMemo } from 'react';

import {
  DAY_END_MINUTE,
  DAY_START_MINUTE,
  HOUR_HEIGHT_PX,
} from '@/lib/constants';
import { durationToPx } from '@/lib/time';
import { cn } from '@/lib/utils';

type Props = {
  /** Takvimin başladığı saat (0-18). */
  startHour?: number;
  /** Şu anın içinde bulunduğu saat (0-23) — rakamı vurgulamak için. */
  activeHour: number | null;
  /** "Şimdi" rozeti bu saate yakınsa etiket gizlenir ki rozetle üst üste binmesin. */
  nowMinute?: number | null;
};

/**
 * İMZA ÖĞESİ — Cetvel.
 *
 * Saat etiketlerini `09:00`, `10:00` biçiminde sade ve okunaklı gösterir.
 */
export function TimelineRuler({
  startHour = DAY_START_MINUTE / 60,
  activeHour,
  nowMinute = null,
}: Props) {
  const hours = useMemo(
    () => Array.from({ length: 24 - startHour }, (_, i) => startHour + i),
    [startHour],
  );
  const heightPx = durationToPx(DAY_END_MINUTE - startHour * 60);

  return (
    <div
      className="relative w-[54px] shrink-0 select-none sm:w-[var(--gutter-width)]"
      style={{ height: heightPx }}
      aria-hidden
    >
      {hours.map((hour) => {
        const top = (hour - startHour) * HOUR_HEIGHT_PX;
        const isActive = activeHour === hour;
        const collidesWithNow =
          nowMinute !== null && Math.abs(hour * 60 - nowMinute) <= 14;

        return (
          <div key={hour}>
            {/* Saat rakamı — çizginin üstüne oturur, ilk saat dışarı taşmaz. */}
            <span
              className={cn(
                'absolute right-2.5 font-mono text-[11px] tabular-nums transition-opacity duration-200 sm:right-3',
                isActive
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground/70',
                collidesWithNow && 'opacity-0',
              )}
              style={{
                top,
                transform: hour === startHour ? 'translateY(2px)' : 'translateY(-50%)',
              }}
            >
              {String(hour).padStart(2, '0')}:00
            </span>

            {/* Saat başı çentiği */}
            <span
              className={cn(
                'absolute right-0 h-px',
                isActive ? 'bg-primary/60' : 'bg-white/[0.08]',
              )}
              style={{ top, width: 6 }}
            />

            {/* Yarım saat (:30) ince cetvel çentiği — yazısız, göz hizalaması için */}
            <span
              className="absolute right-0 h-px bg-white/[0.04]"
              style={{ top: top + HOUR_HEIGHT_PX / 2, width: 3.5 }}
            />
          </div>
        );
      })}
    </div>
  );
}
