'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { postAi } from '@/lib/ai-client';
import { sanitizeScheduleItems, type ScheduleItem } from '@/lib/magic-schedule';
import { useTaskStore } from '@/store/useTaskStore';

const EXAMPLE = '2 saat kod yazacağım, 1 saat spor, akşam 30 dk kitap';

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
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={EXAMPLE}
          aria-label="Gününü anlat, bloklara dağıtayım"
          className="h-9 bg-canvas"
        />
        <Button
          type="submit"
          className="h-9 shrink-0 gap-1.5 px-3"
          disabled={!text.trim() || busy}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Günüme dağıt
        </Button>
      </form>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
        <Checkbox
          checked={withBuffers}
          onCheckedChange={(checked) => setWithBuffers(checked === true)}
          className="size-3.5"
        />
        Blokların arasına 15dk tampon koy
      </label>
    </div>
  );
}
