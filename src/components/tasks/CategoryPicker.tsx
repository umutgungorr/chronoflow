'use client';

import { cn } from '@/lib/utils';
import { CATEGORY_LIST, type TaskCategory } from '@/types';

type Props = {
  value: TaskCategory;
  onChange: (category: TaskCategory) => void;
};

/**
 * Altı kategori, altı düğme. Seçili olan kimlik rengiyle dolar —
 * uygulamada kategori renginin tam doygunlukta göründüğü ikinci yer
 * (birincisi bloğun şeridi). Böylece seçim ile ızgaradaki blok
 * arasındaki bağ gözle kurulabiliyor.
 */
export function CategoryPicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Kategori" className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {CATEGORY_LIST.map((meta) => {
        const isActive = meta.id === value;
        return (
          <button
            key={meta.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(meta.id)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border-foreground/25 bg-foreground/[0.06] font-medium'
                : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
          >
            <span
              className={cn(
                'size-2.5 shrink-0 rounded-[3px]',
                meta.bg,
                meta.id === 'BUFFER' && meta.border,
              )}
              aria-hidden
            />
            <span className="truncate">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
