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
        {/* Cetvel sütununa taşan saat etiketi */}
        <span
          className="absolute -translate-x-full pr-2 font-mono text-[10px] font-semibold leading-none"
          style={{ left: 0 }}
        >
          <span className="inline-flex items-center gap-1 rounded-[3px] bg-now px-1.5 py-0.5 text-[10px] font-bold text-now-contrast shadow-[0_0_8px_var(--now)]">
            <span className="size-1 rounded-full bg-current opacity-80" aria-hidden />
            {label}
          </span>
        </span>
        <span className="h-px w-full bg-now shadow-[0_0_6px_var(--now)]" />
      </div>
    </div>
  );
}
