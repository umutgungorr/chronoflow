'use client';

import { DAY_END_MINUTE, DAY_START_MINUTE, HOUR_HEIGHT_PX } from '@/lib/constants';
import { durationToPx, minutesToY } from '@/lib/time';

/** Gündüz penceresi dışında kalan saatler (gece) hafifçe gölgelenir. */
const NIGHT_BANDS = [
  { from: 0, to: 6 * 60 },
  { from: 22 * 60, to: 24 * 60 },
];

type Props = {
  /** Görünümün başlangıç dakikası (örn. 09:00 -> 540). */
  startMinute?: number;
};

/**
 * Tuvalin arka planı: saat ve yarım saat çizgileri.
 *
 * Çizgiler tekrar eden gradient ile çiziliyor — her saat için ayrı DOM
 * elemanı üretmektense tek katman; kaydırma sırasında bedava.
 */
export function GridLines({ startMinute = DAY_START_MINUTE }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {NIGHT_BANDS.map((band) => {
        const from = Math.max(band.from, startMinute);
        const to = Math.min(band.to, DAY_END_MINUTE);
        if (to <= from) return null;

        return (
          <div
            key={band.from}
            className="absolute inset-x-0 bg-muted/45"
            style={{
              top: minutesToY(from, startMinute),
              height: durationToPx(to - from),
            }}
          />
        );
      })}

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            `repeating-linear-gradient(to bottom, var(--rule) 0 1px, transparent 1px ${HOUR_HEIGHT_PX}px)`,
            `repeating-linear-gradient(to bottom, var(--rule-soft) 0 1px, transparent 1px ${HOUR_HEIGHT_PX}px)`,
          ].join(', '),
          // İkinci gradient yarım saat kadar aşağı kaydırılır: :30 çizgileri.
          backgroundPosition: `0 0, 0 ${HOUR_HEIGHT_PX / 2}px`,
        }}
      />
    </div>
  );
}
