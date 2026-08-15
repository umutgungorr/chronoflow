'use client';

import {
  HOUR_HEIGHT_PX,
  SLOT_HEIGHT_PX,
  TIMELINE_HEIGHT_PX,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** 15dk çentiklerinin saat içindeki konumu ve uzunluğu (px). */
const SUB_TICKS = [
  { slot: 1, length: 5 }, // :15
  { slot: 2, length: 10 }, // :30 — daha uzun, yarım saati okumayı kolaylaştırır
  { slot: 3, length: 5 }, // :45
];

type Props = {
  /** Şu anın içinde bulunduğu saat (0-23) — rakamı vurgulamak için. */
  activeHour: number | null;
};

/**
 * İMZA ÖĞESİ — Cetvel.
 *
 * Çentik uzunlukları ızgaranın snap çözünürlüğünü doğrudan gösterir:
 * uzun çentik = saat, orta = yarım saat, kısa = 15dk. Yani kullanıcı
 * bir bloğu sürüklemeden önce nereye yapışacağını cetvelden okuyabilir.
 */
export function TimelineRuler({ activeHour }: Props) {
  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: 'var(--gutter-width)', height: TIMELINE_HEIGHT_PX }}
      aria-hidden
    >
      {HOURS.map((hour) => {
        const top = hour * HOUR_HEIGHT_PX;
        const isActive = activeHour === hour;

        return (
          <div key={hour}>
            {/* Saat rakamı — çizginin üstüne oturur, ilk saat dışarı taşmaz. */}
            <span
              className={cn(
                'absolute right-5 font-mono text-[11px] tabular-nums transition-colors',
                isActive
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground/70',
              )}
              style={{
                top,
                transform: hour === 0 ? 'translateY(0)' : 'translateY(-50%)',
              }}
            >
              {String(hour).padStart(2, '0')}
            </span>

            {/* Saat çentiği */}
            <span
              className={cn(
                'absolute right-0 h-px',
                isActive ? 'bg-foreground' : 'bg-tick',
              )}
              style={{ top, width: 16 }}
            />

            {/* 15 / 30 / 45 çentikleri */}
            {SUB_TICKS.map(({ slot, length }) => (
              <span
                key={slot}
                className="absolute right-0 h-px bg-tick/60"
                style={{ top: top + slot * SLOT_HEIGHT_PX, width: length }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
