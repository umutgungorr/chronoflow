'use client';

import { minutesToY } from '@/lib/time';

type Props = {
  /** Gün içi dakika. */
  minute: number;
  label: string;
};

/**
 * "Şimdi" çizgisi — o anki saati gösteren canlı gösterge.
 *
 * Dakika ilerledikçe `transition-[top]` ile takvim üzerinde akıcı
 * şekilde aşağı kayar; takılıp donmaz.
 */
export function NowIndicator({ minute, label }: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 transition-[top] duration-500 ease-out"
      style={{ top: minutesToY(minute) }}
      aria-label={`Şu an ${label}`}
    >
      <div className="relative flex items-center">
        {/* Cetvel sütununa taşan yuvarlak saat rozeti ve bağlantı çizgisi */}
        <span
          className="absolute flex -translate-x-full items-center font-mono text-[10px] font-semibold leading-none"
          style={{ left: 0 }}
        >
          <span className="inline-flex items-center rounded-full bg-now px-2 py-0.5 text-[10px] font-bold text-now-contrast shadow-[0_0_12px_var(--now)]">
            {label}
          </span>
          <span className="h-px w-2.5 bg-now shadow-[0_0_6px_var(--now)]" aria-hidden />
        </span>
        {/* Sol kenar dikey vurgu çentiği */}
        <span
          className="absolute -left-px h-3.5 w-[2px] rounded-full bg-now shadow-[0_0_8px_var(--now)]"
          aria-hidden
        />
        <span className="h-px w-full bg-now/75 shadow-[0_0_6px_var(--now)]" />
      </div>
    </div>
  );
}
