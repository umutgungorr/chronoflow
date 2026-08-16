'use client';

import { Undo2 } from 'lucide-react';

import { SyncStatus } from '@/components/layout/SyncStatus';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';
import { CATEGORY_LIST } from '@/types';

/**
 * Renk anahtarı. Uygulamadaki tek renk sözlüğü burası olduğu için
 * kullanıcı bloklara bakarken kategoriyi ezberlemek zorunda kalmıyor.
 */
export function CategoryLegend() {
  const resetToMock = useTaskStore((s) => s.resetToMock);
  const clearDay = useTaskStore((s) => s.clearDay);
  const undo = useTaskStore((s) => s.undo);
  const geriAlinabilir = useTaskStore((s) => s.history.length > 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3">
      <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        {CATEGORY_LIST.map((meta) => (
          <li
            key={meta.id}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <span
              className={cn(
                'size-2.5 rounded-[3px]',
                meta.bg,
                meta.id === 'BUFFER' && meta.border,
              )}
              aria-hidden
            />
            {meta.label}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-1">
        <SyncStatus />
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
          onClick={undo}
          disabled={!geriAlinabilir}
          title="Son değişikliği geri al (Ctrl+Z)"
        >
          <Undo2 className="size-3" />
          Geri al
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={clearDay}
        >
          Günü temizle
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={resetToMock}
        >
          Örnek planı yükle
        </Button>
      </div>
    </div>
  );
}
