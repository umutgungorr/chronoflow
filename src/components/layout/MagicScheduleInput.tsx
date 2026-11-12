'use client';

import { useState } from 'react';
import { Clock, Loader2, Search, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { postAi } from '@/lib/ai-client';
import { MAX_DAY_START_HOUR } from '@/lib/constants';
import { sanitizeScheduleItems, type ScheduleItem } from '@/lib/magic-schedule';
import { useTaskStore } from '@/store/useTaskStore';

const EXAMPLE = 'Örn: 2 saat kod, 1 saat spor';
const DAY_START_HOURS = Array.from({ length: MAX_DAY_START_HOUR + 1 }, (_, i) => i);

/**
 * "Günüme Dağıt" girdisi.
 *
 * Önce sunucudaki LLM (Gemini) denenir; yapılandırılmamışsa, oturum yoksa ya
 * da istek başarısızsa kural tabanlı yerel ayrıştırıcıya düşer
 * (bkz. lib/magic-schedule.ts). Yani AI olmadan da her şey çalışır.
 */
export function MagicScheduleInput() {
  const applyMagicSchedule = useTaskStore((s) => s.applyMagicSchedule);
  const applyScheduleItems = useTaskStore((s) => s.applyScheduleItems);
  const dayStartHour = useTaskStore((s) => s.dayStartHour);
  const setDayStartHour = useTaskStore((s) => s.setDayStartHour);
  const [text, setText] = useState('');
  const [withBuffers, setWithBuffers] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const ai = await postAi<{ items: unknown }>('/api/plan', { text });
      const items: ScheduleItem[] = ai ? sanitizeScheduleItems(ai.items) : [];

      const { placed } =
        items.length > 0
          ? applyScheduleItems(items, { withBuffers })
          : applyMagicSchedule(text, { withBuffers });
      if (placed > 0) setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 pb-3">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={EXAMPLE}
            aria-label="Gününü anlat, bloklara dağıtayım"
            className="h-10 rounded-xl bg-canvas pl-9"
          />
        </div>
        <Button
          type="submit"
          className="h-10 shrink-0 gap-1.5 rounded-xl px-4"
          disabled={!text.trim() || busy}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Günüme dağıt
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
          <Checkbox
            checked={withBuffers}
            onCheckedChange={(checked) => setWithBuffers(checked === true)}
            className="size-3.5"
          />
          Blokların arasına 15dk tampon koy
        </label>

        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3 text-primary/80" aria-hidden />
          <span>Günü başlat:</span>
          <select
            aria-label="Günün başlangıç saati"
            value={dayStartHour}
            onChange={(event) => setDayStartHour(Number(event.target.value))}
            className="h-6 cursor-pointer rounded-md border border-white/[0.1] bg-[#0b1117] px-1.5 font-mono text-[11px] font-medium text-foreground outline-none transition-colors hover:border-primary/40 focus-visible:border-primary"
          >
            {DAY_START_HOURS.map((hour) => (
              <option key={hour} value={hour} className="bg-[#0b1117] text-foreground">
                {String(hour).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
