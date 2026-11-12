'use client';

import { DAY_END_MINUTE } from '@/lib/constants';
import { cn } from '@/lib/utils';

const HOURS_BASE = Array.from({ length: 24 }, (_, i) => i);
const HOURS_WITH_END = [...HOURS_BASE, 24];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const MINUTE_STEPS = [-5, -1, 1, 5] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

type Props = {
  id: string;
  label: string;
  /** Gün içi dakika (0..1440). */
  value: number;
  onChange: (minutes: number) => void;
  /** 24:00 (gün sonu) seçeneğine izin verir — bitiş saati için. */
  allowEndOfDay?: boolean;
  /** Altındaki -5/-1/+1/+5 dk ince ayar butonlarını gösterir. */
  showNudge?: boolean;
  className?: string;
};

/**
 * Mobil ve masaüstü uyumlu tam dakika seçici (Saat 00-23/24 : Dakika 00-59).
 *
 * Yerel `<input type="time">` bazı mobil tarayıcılarda ve iOS Safari modal
 * pencerelerinde 1 dakikalık seçimi zorlaştırdığı veya state ile çakıştığı için
 * her zaman 00..59 dakika sunan yerel `<select>` tekerlekleri kullanır.
 */
export function TimeSelect({
  id,
  label,
  value,
  onChange,
  allowEndOfDay = false,
  showNudge = true,
  className,
}: Props) {
  const maxMinutes = allowEndOfDay ? DAY_END_MINUTE : DAY_END_MINUTE - 1;
  const clamped = Math.max(0, Math.min(maxMinutes, Math.round(value)));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  const hourOptions = allowEndOfDay ? HOURS_WITH_END : HOURS_BASE;

  const update = (nextMinutes: number) => {
    onChange(Math.max(0, Math.min(maxMinutes, nextMinutes)));
  };

  const handleHourChange = (nextHour: number) => {
    if (nextHour === 24) {
      update(DAY_END_MINUTE);
      return;
    }
    update(nextHour * 60 + minute);
  };

  const handleMinuteChange = (nextMinute: number) => {
    const safeHour = hour === 24 ? 23 : hour;
    update(safeHour * 60 + nextMinute);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1 rounded-xl border border-white/[0.1] bg-[#070c10] px-1.5 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <select
          id={id}
          aria-label={`${label} saati`}
          value={hour}
          onChange={(e) => handleHourChange(Number(e.target.value))}
          style={{ colorScheme: 'dark' }}
          className="h-9 flex-1 cursor-pointer rounded-lg bg-transparent px-1 text-center font-mono text-base font-semibold tabular-nums text-foreground outline-none hover:bg-white/[0.04] sm:text-sm"
        >
          {hourOptions.map((h) => (
            <option key={h} value={h} className="bg-[#0c1218] text-foreground">
              {pad2(h)}
            </option>
          ))}
        </select>

        <span className="font-mono text-sm font-bold text-muted-foreground select-none" aria-hidden>
          :
        </span>

        <select
          id={`${id}-minute`}
          aria-label={`${label} dakikası`}
          value={hour === 24 ? 0 : minute}
          onChange={(e) => handleMinuteChange(Number(e.target.value))}
          style={{ colorScheme: 'dark' }}
          className="h-9 flex-1 cursor-pointer rounded-lg bg-transparent px-1 text-center font-mono text-base font-semibold tabular-nums text-foreground outline-none hover:bg-white/[0.04] sm:text-sm"
        >
          {MINUTES.map((m) => (
            <option key={m} value={m} className="bg-[#0c1218] text-foreground">
              {pad2(m)}
            </option>
          ))}
        </select>
      </div>

      {showNudge && (
        <div className="flex items-center gap-1">
          {MINUTE_STEPS.map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => update(clamped + delta)}
              aria-label={`${label} saatini ${delta > 0 ? `+${delta}` : delta} dakika ayarla`}
              className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.03] py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground active:scale-95"
            >
              {delta > 0 ? `+${delta}` : delta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
