'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Sparkles } from 'lucide-react';

import {
  getTaskIconMeta,
  isTaskIconId,
  TASK_ICON_CATALOG,
  TASK_ICON_GROUPS,
  type TaskIconGroup,
} from '@/lib/task-icons';
import { cn } from '@/lib/utils';
import type { TaskCategory } from '@/types';

type Props = {
  title: string;
  category: TaskCategory;
  value?: string;
  onChange: (icon?: string) => void;
};

/**
 * Başlık kutusunun hemen solunda duran küçük Notion tarzı imge düğmesi.
 * Tıklanınca 34 imge arasından seçim yapılabilen açılır pencere (popover) açılır.
 */
export function IconPicker({ title, category, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<TaskIconGroup>('academic');
  const rootRef = useRef<HTMLDivElement>(null);

  const isCustom = isTaskIconId(value);
  const activeMeta = getTaskIconMeta(title, category, value);
  const ActiveIcon = activeMeta.icon;
  const visibleIcons = TASK_ICON_CATALOG.filter((item) => item.group === group);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={`İmge seç (${activeMeta.label})`}
        title={`${activeMeta.label} · İmgeyi değiştirmek için tıkla`}
        className={cn(
          'group/icon relative flex size-9 items-center justify-center rounded-lg border border-white/[0.1] transition-all',
          'hover:scale-105 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'border-primary ring-2 ring-primary/30',
          activeMeta.badgeClass,
        )}
      >
        <ActiveIcon className="size-4 stroke-[2]" aria-hidden />
        <span
          className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full border border-white/15 bg-[#0b1219] text-muted-foreground opacity-80 transition-opacity group-hover/icon:opacity-100 group-hover/icon:text-primary"
          aria-hidden
        >
          <Pencil className="size-2" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-white/[0.12] bg-[#0b1219] p-2.5 shadow-2xl sm:w-80">
          {/* Üst bilgi + Otomatik sıfırlama */}
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{activeMeta.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {isCustom ? 'Özel seçili imge' : 'Otomatik (başlığa göre)'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-primary/90 transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              <Sparkles className="size-3" />
              Otomatik
            </button>
          </div>

          {/* Grup sekmeleri */}
          <div className="mb-2 flex flex-wrap gap-1">
            {TASK_ICON_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                  group === g.id
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* 6 sütunlu kompakt ikon ızgarası */}
          <div className="grid grid-cols-6 gap-1.5">
            {visibleIcons.map((item) => {
              const Icon = item.icon;
              const selected = activeMeta.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-center rounded-lg border p-2 transition-all',
                    selected
                      ? 'border-primary/70 bg-primary/15 shadow-[0_0_12px_-4px_var(--primary)]'
                      : 'border-white/[0.05] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-md',
                      item.badgeClass,
                    )}
                    aria-hidden
                  >
                    <Icon className="size-3.5 stroke-[2]" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
