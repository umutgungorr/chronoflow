'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useTaskStore } from '@/store/useTaskStore';

const EXAMPLE = '2 saat kod yazacağım, 1 saat spor, akşam 30 dk kitap';

/**
 * "Günüme Dağıt" girdisi.
 *
 * Metni ayrıştırıp boş saatlere blok olarak dağıtır. Ayrıştırma kural
 * tabanlı ve çevrimdışı çalışır (bkz. lib/magic-schedule.ts) — sonuç
 * deterministik, yani aynı cümle her zaman aynı planı üretir.
 */
export function MagicScheduleInput() {
  const applyMagicSchedule = useTaskStore((s) => s.applyMagicSchedule);
  const [text, setText] = useState('');
  const [withBuffers, setWithBuffers] = useState(true);

  const handleSubmit = () => {
    if (!text.trim()) return;
    const { placed } = applyMagicSchedule(text, { withBuffers });
    if (placed > 0) setText('');
  };

  return (
    <div className="flex flex-col gap-2 pb-3">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={EXAMPLE}
          aria-label="Gününü anlat, bloklara dağıtayım"
          className="h-9 bg-canvas"
        />
        <Button type="submit" className="h-9 shrink-0 gap-1.5 px-3" disabled={!text.trim()}>
          <Sparkles className="size-3.5" />
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
