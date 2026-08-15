'use client';

import { useState, type PointerEvent as ReactPointerEvent } from 'react';

import { DAY_END_MINUTE } from '@/lib/constants';
import { formatDuration, formatTime, fromDayMinutes, minutesToY, yToSnappedMinutes } from '@/lib/time';

type Props = {
  /** Görüntülenen gün — önizleme etiketinin saatini biçimlemek için. */
  day: Date;
  /** Bir blok sürüklenirken bu katman sessizleşir. */
  disabled?: boolean;
  /** Verilen başlangıç için oluşturulacak bloğun süresi (dk). */
  getDuration: (startMinute: number) => number;
  onCreate: (startMinute: number) => void;
};

/**
 * Tuvalin boş alanı. Blokların ALTINDA durur; bir bloğun üzerindeyken
 * pointer olayları bloğa gider ve bu katman sessizleşir.
 *
 * ── Koordinat matematiği (Adım 3'te sürüklemede aynısı kullanılacak) ──
 *   1. rect = katmanın ekrandaki kutusu
 *   2. y    = imlecin katman tepesine göre ofseti  (clientY - rect.top)
 *   3. dk   = y / PX_PER_MINUTE                    (piksel → dakika)
 *   4. snap = round(dk / 15) * 15                  (mıknatıslanma)
 * Adım 3-4 `yToSnappedMinutes()` içinde kapsüllenmiştir.
 */
export function SlotInteractionLayer({ day, disabled, getDuration, onCreate }: Props) {
  const [hoverMinute, setHoverMinute] = useState<number | null>(null);

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Dokunmatik sürüklemede önizleme göstermiyoruz; yalnızca imleç.
    if (event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverMinute(yToSnappedMinutes(event.clientY - rect.top));
  };

  const previewDuration =
    hoverMinute === null ? 0 : Math.min(getDuration(hoverMinute), DAY_END_MINUTE - hoverMinute);
  const isVisible = !disabled && hoverMinute !== null && hoverMinute < DAY_END_MINUTE;

  return (
    <div
      className="absolute inset-0 z-0"
      onPointerMove={handleMove}
      onPointerLeave={() => setHoverMinute(null)}
      onClick={() => {
        if (hoverMinute !== null && hoverMinute < DAY_END_MINUTE) onCreate(hoverMinute);
      }}
    >
      {isVisible && (
        <div
          className="pointer-events-none absolute inset-x-2 rounded-md border border-dashed border-foreground/25 bg-foreground/[0.04] transition-[top,height] duration-75"
          style={{
            top: minutesToY(hoverMinute),
            height: Math.max(minutesToY(previewDuration), 12),
          }}
        >
          <span className="absolute left-2 top-1 font-mono text-[10px] leading-none text-muted-foreground">
            {formatTime(fromDayMinutes(day, hoverMinute))}
            <span className="mx-1 opacity-40">·</span>
            {formatDuration(previewDuration)}
          </span>
        </div>
      )}
    </div>
  );
}
