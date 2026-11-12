'use client';

import { useDraggable } from '@dnd-kit/core';
import {
  Check,
  Clock,
  Coffee,
  Dumbbell,
  Laptop,
  Lock,
  Pencil,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react';
import type { KeyboardEvent } from 'react';

import { applyDragPreview, type DragMode, type DragPreview } from '@/lib/layout';
import {
  formatDuration,
  formatRange,
  formatTime,
  fromDayMinutes,
  minutesToY,
} from '@/lib/time';
import { cn } from '@/lib/utils';
import { CATEGORY_META, type Task, type TaskCategory } from '@/types';

/** Tutamaç şeritlerinin yüksekliği (px). Dokunmatikte de yakalanabilir. */
const HANDLE_PX = 7;

/** Üst tutamağın gösterileceği en küçük blok süresi (dk). */
const TOP_HANDLE_MIN_DURATION = 45;

const CATEGORY_ICONS: Record<TaskCategory, typeof Laptop> = {
  WORK: Laptop,
  ROUTINE: Coffee,
  HEALTH: Dumbbell,
  URGENT: Zap,
  SOCIAL: Users,
  BUFFER: Clock,
};

function renderTaskIcon(task: Task) {
  const lower = task.title.toLocaleLowerCase('tr-TR');
  if (lower.includes('plan') || lower.includes('öncelik')) {
    return <RefreshCw className="size-4 stroke-[2]" />;
  }
  if (lower.includes('öğle') || lower.includes('kahve') || lower.includes('mola')) {
    return <Coffee className="size-4 stroke-[2]" />;
  }
  if (lower.includes('spor') || lower.includes('antrenman') || lower.includes('yürüyüş')) {
    return <Dumbbell className="size-4 stroke-[2]" />;
  }
  const Icon = CATEGORY_ICONS[task.category] ?? Laptop;
  return <Icon className="size-4 stroke-[2]" />;
}

type Props = {
  task: Task;
  day: Date;
  lane: number;
  laneCount: number;
  isSelected: boolean;
  /** Yalnızca bu blok sürükleniyorsa dolu gelir. */
  preview: DragPreview | null;
  onSelect: (id: string) => void;
  /** Düzenleme penceresini açar (çift tık veya Enter). */
  onOpen: (id: string) => void;
  /** Klavyeyle taşıma/boyutlandırma (ok tuşları). */
  onNudge: (id: string, mode: DragMode, deltaMinutes: number) => void;
  onDelete: (id: string) => void;
  onToggleComplete?: (id: string) => void;
};

export function TaskBlock({
  task,
  day,
  lane,
  laneCount,
  isSelected,
  preview,
  onSelect,
  onOpen,
  onNudge,
  onDelete,
  onToggleComplete,
}: Props) {
  const meta = CATEGORY_META[task.category];
  const isBuffer = task.category === 'BUFFER';

  /*
   * Konum tek bir yerden türetilir: görevin kendi saati + (varsa) sürükleme
   * deltası. Bu yüzden dnd-kit'in `transform` değerini KULLANMIYORUZ —
   * blok, önizlenen dakikaya birebir denk gelen piksele yerleşir. Ekranda
   * gördüğün yer ile bırakınca kaydedilecek yer aynı olur.
   */
  const { start, duration } = applyDragPreview(task, preview);
  const top = minutesToY(start);
  const height = minutesToY(duration);

  // Gövde: taşıma tutamacı. Tutamaçlar KARDEŞ elemanlar — iç içe olsalardı
  // pointerdown olayı iki sensörü birden tetiklerdi.
  const { setNodeRef: setMoveRef, listeners: moveListeners } = useDraggable({
    id: `${task.id}|move`,
    data: { taskId: task.id, mode: 'move' },
  });
  const { setNodeRef: setTopHandleRef, listeners: topHandleListeners } = useDraggable({
    id: `${task.id}|resize-start`,
    data: { taskId: task.id, mode: 'resize-start' },
  });
  const { setNodeRef: setBottomHandleRef, listeners: bottomHandleListeners } = useDraggable({
    id: `${task.id}|resize-end`,
    data: { taskId: task.id, mode: 'resize-end' },
  });

  const isDragging = preview !== null;
  const isCompact = duration <= 30;
  const showTopHandle = duration >= TOP_HANDLE_MIN_DURATION;

  const startLabel = formatTime(fromDayMinutes(day, start));
  const endLabel = formatTime(fromDayMinutes(day, start + duration));

  /** Ok tuşları: taşı. Shift + ok: alt kenarı çek. Enter: düzenle. Delete: sil. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowUp' ? -15 : event.key === 'ArrowDown' ? 15 : 0;
    if (step !== 0) {
      event.preventDefault();
      onNudge(task.id, event.shiftKey ? 'resize-end' : 'move', step);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(task.id);
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onDelete(task.id);
    }
  };

  // Çakışan bloklar yan yana: sütun genişliği kümedeki sütun sayısına bölünür.
  const laneWidth = 100 / laneCount;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${task.title}, ${formatRange(task)}. Enter ile düzenle, ok tuşlarıyla taşı, Shift+ok ile süreyi değiştir.`}
      aria-pressed={isSelected}
      onKeyDown={handleKeyDown}
      style={{
        top,
        height: Math.max(height - 3, 20),
        left: `${lane * laneWidth}%`,
        width: `calc(${laneWidth}% - 4px)`,
      }}
      className={cn(
        'group/block pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border text-left backdrop-blur-sm transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
        isBuffer
          ? 'border-dashed border-white/10 bg-[#0d141b]/70'
          : 'border-white/[0.08] bg-[#101820]/90 hover:border-white/[0.15] hover:bg-[#121c26]/95',
        isDragging
          ? 'z-40 shadow-[0_12px_32px_rgba(0,0,0,0.6)] ring-1 ring-primary/40'
          : 'z-10 shadow-[0_4px_20px_rgba(0,0,0,0.28)]',
        isSelected && !isDragging && 'ring-2 ring-primary/70',
      )}
    >
      {/* Sol kenar parlak kategori/turkuaz vurgu şeridi */}
      {!isBuffer && (
        <span
          className={cn(
            'absolute inset-y-0 left-0 w-1 rounded-l-xl',
            meta.bg,
            'shadow-[0_0_12px_currentColor]',
          )}
          aria-hidden
        />
      )}

      {/* Üst tutamaç: bitişi sabit tutup başlangıcı çeker. */}
      {showTopHandle && (
        <div
          ref={setTopHandleRef}
          {...topHandleListeners}
          tabIndex={-1}
          aria-hidden
          style={{ height: HANDLE_PX }}
          className="w-full shrink-0 cursor-ns-resize touch-none"
        />
      )}

      {/* Gövde: taşıma yüzeyi. */}
      <div
        ref={setMoveRef}
        {...moveListeners}
        tabIndex={-1}
        onClick={() => onSelect(task.id)}
        onDoubleClick={() => onOpen(task.id)}
        className={cn(
          'flex min-h-0 flex-1 touch-none items-center justify-between gap-3 overflow-hidden pl-4 pr-3.5',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {!isCompact && (
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] text-primary',
                isBuffer && 'text-muted-foreground',
              )}
              aria-hidden
            >
              {renderTaskIcon(task)}
            </span>
          )}

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <span className="flex w-full items-center gap-1.5">
              <span
                className={cn(
                  'truncate font-semibold leading-tight text-foreground',
                  isCompact ? 'text-xs' : 'text-[13.5px]',
                  isBuffer && 'font-normal text-muted-foreground',
                )}
              >
                {task.title}
              </span>
              {task.isFixed && (
                <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Sabit" />
              )}
              {isCompact && !isDragging && (
                <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                  {startLabel} – {endLabel}
                </span>
              )}
            </span>

            {!isCompact && (
              <span className="mt-0.5 font-mono text-[11px] leading-tight text-muted-foreground">
                {startLabel} – {endLabel}
                {duration > 60 && (
                  <>
                    <span className="mx-1.5 opacity-40">·</span>
                    <span>{formatDuration(duration)}</span>
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Sağdaki düzenle + yuvarlak tamamlandı düğmeleri */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(task.id);
            }}
            aria-label={`${task.title} bloğunu düzenle`}
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-muted-foreground transition-all hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isSelected
                ? 'opacity-100'
                : 'pointer-events-none opacity-0 group-hover/block:pointer-events-auto group-hover/block:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
            )}
          >
            <Pencil className="size-3" />
          </button>

          {!isBuffer && onToggleComplete && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(task.id);
              }}
              aria-label={
                task.isCompleted
                  ? `${task.title} tamamlandı işaretini kaldır`
                  : `${task.title} tamamlandı olarak işaretle`
              }
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                task.isCompleted
                  ? 'border-primary bg-primary/15 text-primary shadow-[0_0_12px_rgba(46,230,184,0.3)]'
                  : 'border-white/20 bg-transparent text-transparent hover:border-primary/60 hover:text-primary/40',
              )}
            >
              <Check className="size-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Alt tutamaç: süreyi uzatır/kısaltır. Üzerine gelince belirginleşir. */}
      <div
        ref={setBottomHandleRef}
        {...bottomHandleListeners}
        tabIndex={-1}
        aria-hidden
        style={{ height: HANDLE_PX }}
        className="group/handle flex w-full shrink-0 cursor-ns-resize touch-none items-center justify-center"
      >
        <span
          className={cn(
            'h-[2px] w-6 rounded-full bg-foreground/25 transition-opacity',
            isDragging ? 'opacity-100' : 'opacity-0 group-hover/handle:opacity-100',
          )}
        />
      </div>

      {/* Sürüklerken canlı saat rozeti: hangi dakikaya yapıştığını söyler. */}
      {isDragging && (
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-now px-2 py-0.5 font-mono text-[10px] font-bold leading-none text-now-contrast shadow-[0_0_8px_var(--now)]">
          {startLabel} – {endLabel}
        </span>
      )}
    </div>
  );
}
