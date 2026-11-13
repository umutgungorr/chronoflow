'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

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
 * Notion tarzı ikon seçici: varsayılan olarak başlığa göre otomatik
 * en uygun ders/aktivite imgesini seçer; istenirse elle 34 imge arasından değiştirilebilir.
 */
export function IconPicker({ title, category, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<TaskIconGroup>('academic');

  const isCustom = isTaskIconId(value);
  const activeMeta = getTaskIconMeta(title, category, value);
  const ActiveIcon = activeMeta.icon;
  const visibleIcons = TASK_ICON_CATALOG.filter((item) => item.group === group);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="flex flex-1 items-center justify-between gap-2.5 rounded-lg border border-white/[0.08] bg-muted/40 px-2.5 py-2 text-left text-xs transition-colors hover:border-white/20 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-md',
                activeMeta.badgeClass,
              )}
              aria-hidden
            >
              <ActiveIcon className="size-4 stroke-[2]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-foreground">{activeMeta.label}</span>
              <span className="block text-[10px] text-muted-foreground">
                {isCustom ? 'Özel seçili imge' : 'Otomatik (başlığa göre)'}
              </span>
            </span>
          </span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {isCustom && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title="Başlığa göre otomatik seçime dön"
            className="flex h-11 shrink-0 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Sparkles className="size-3.5" />
            Otomatik
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-xl border border-white/[0.1] bg-[#0b1219] p-2.5 shadow-xl">
          {/* Grup sekmeleri + otomatik sıfırlama */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5 border-b border-white/[0.06] pb-2">
            <div className="flex flex-wrap gap-1">
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

            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary/90 transition-colors hover:bg-primary/10"
            >
              <Sparkles className="size-3" />
              Otomatik Seç
            </button>
          </div>

          {/* İkon Izgarası */}
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {visibleIcons.map((item) => {
              const Icon = item.icon;
              const selected = activeMeta.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-all',
                    selected
                      ? 'border-primary/60 bg-primary/12 text-foreground shadow-[0_0_12px_-4px_var(--primary)]'
                      : 'border-white/[0.05] bg-white/[0.02] text-muted-foreground hover:border-white/15 hover:bg-white/[0.05] hover:text-foreground',
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
                  <span className="w-full truncate text-[9px] leading-tight">
                    {item.label.split(' / ')[0]}
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
