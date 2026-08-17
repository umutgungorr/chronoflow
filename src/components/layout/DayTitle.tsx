'use client';

import { useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

import { dayKey } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';

const MAX_UZUNLUK = 60;

/**
 * Güne verilen ad — tarihin hemen altında.
 *
 * Ayrı bir "düzenle" düğmesi yok: yazının kendisine basınca girdiye
 * dönüşüyor. Adı olmayan günde soluk bir davet duruyor ("Güne ad ver"),
 * böylece boş hali de tıklanabilir olduğunu belli ediyor ama göz almıyor.
 */
export function DayTitle() {
  const day = useTaskStore((s) => s.selectedDate);
  const titles = useTaskStore((s) => s.dayTitles);
  const setDayTitle = useTaskStore((s) => s.setDayTitle);

  const kayitli = titles[dayKey(day)] ?? '';
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [taslak, setTaslak] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const baslat = () => {
    setTaslak(kayitli);
    setDuzenleniyor(true);
  };

  const kaydet = () => {
    setDayTitle(day, taslak);
    setDuzenleniyor(false);
  };

  const vazgec = () => setDuzenleniyor(false);

  if (duzenleniyor) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={taslak}
        maxLength={MAX_UZUNLUK}
        placeholder="Bu gün neyin günü?"
        onChange={(event) => setTaslak(event.target.value)}
        onBlur={kaydet}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            kaydet();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            vazgec();
          }
        }}
        className="w-full max-w-xs rounded border-b border-dashed border-foreground/30 bg-transparent pb-0.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-foreground"
        aria-label="Gün adı"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={baslat}
      className={cn(
        'group flex max-w-full items-center gap-1.5 rounded text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        kayitli
          ? 'text-foreground/80 hover:text-foreground'
          : 'text-muted-foreground/60 hover:text-muted-foreground',
      )}
      title={kayitli ? 'Gün adını düzenle' : 'Güne bir ad ver'}
    >
      <span className="truncate border-b border-dashed border-transparent group-hover:border-foreground/25">
        {kayitli || 'Güne ad ver'}
      </span>
      <Pencil
        className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden
      />
    </button>
  );
}
