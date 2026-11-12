'use client';

import {
  HOUR_HEIGHT_PX,
  TIMELINE_HEIGHT_PX,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type Props = {
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
export function TimelineRuler({ activeHour, nowMinute = null }: Props) {
  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: 'var(--gutter-width)', height: TIMELINE_HEIGHT_PX }}
      aria-hidden
    >
      {HOURS.map((hour) => {
        const top = hour * HOUR_HEIGHT_PX;
        const isActive = activeHour === hour;
        const collidesWithNow =
          nowMinute !== null && Math.abs(hour * 60 - nowMinute) <= 14;

        return (
          <div key={hour}>
            {/* Saat rakamı — çizginin üstüne oturur, ilk saat dışarı taşmaz. */}
            <span
              className={cn(
                'absolute right-3 font-mono text-[11px] tabular-nums transition-opacity duration-200',
                isActive
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground/70',
                collidesWithNow && 'opacity-0',
              )}
              style={{
                top,
                transform: hour === 0 ? 'translateY(2px)' : 'translateY(-50%)',
              }}
            >
              {String(hour).padStart(2, '0')}:00
            </span>

            {/* Saat çentiği */}
            <span
              className={cn(
                'absolute right-0 h-px',
                isActive ? 'bg-primary/60' : 'bg-white/[0.06]',
              )}
              style={{ top, width: 6 }}
            />
          </div>
        );
      })}
    </div>
  );
}
