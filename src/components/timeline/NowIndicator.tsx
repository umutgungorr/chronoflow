'use client';

import { minutesToY } from '@/lib/time';

type Props = {
  /** Gün içi dakika. */
  minute: number;
  label: string;
};

/**
 * "Şimdi" çizgisi — sayfadaki tek maksimum kontrast öğesi.
 *
 * Renk kullanmıyor (renk = kategori kuralı), bunun yerine dolu mürekkep
 * bir etiket + tam genişlik saç teli çizgi kullanıyor. Cetvelin üstüne
 * taşarak bir ölçüm aletinin okuma imleci gibi davranır.
 */
export function NowIndicator({ minute, label }: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30"
      style={{ top: minutesToY(minute) }}
      aria-label={`Şu an ${label}`}
    >
      <div className="relative flex items-center">
        {/* Cetvel sütununa taşan saat etiketi */}
        <span
          className="absolute -translate-x-full pr-2 font-mono text-[10px] font-medium leading-none"
          style={{ left: 0 }}
        >
          <span className="inline-block rounded-[3px] bg-now px-1.5 py-1 text-now-contrast">
            {label}
          </span>
        </span>
        <span className="h-px w-full bg-now" />
      </div>
    </div>
  );
}
