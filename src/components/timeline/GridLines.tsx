'use client';

import { HOUR_HEIGHT_PX } from '@/lib/constants';
import { minutesToY } from '@/lib/time';

/** Gündüz penceresi dışında kalan saatler (gece) hafifçe gölgelenir. */
const NIGHT_BANDS = [
  { from: 0, to: 6 * 60 },
  { from: 22 * 60, to: 24 * 60 },
];

/**
 * Tuvalin arka planı: saat ve yarım saat çizgileri.
 *
 * Çizgiler tekrar eden gradient ile çiziliyor — 24 saat için ayrı DOM
 * elemanı üretmektense tek katman; kaydırma sırasında bedava.
 * 15dk çizgileri bilerek YOK: tuvalde 96 çizgi görsel gürültü olurdu,
 * o çözünürlüğü cetvel (TimelineRuler) ve sürükleme önizlemesi anlatıyor.
 */
export function GridLines() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {NIGHT_BANDS.map((band) => (
        <div
          key={band.from}
          className="absolute inset-x-0 bg-muted/45"
          style={{
            top: minutesToY(band.from),
            height: minutesToY(band.to) - minutesToY(band.from),
          }}
        />
      ))}

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
