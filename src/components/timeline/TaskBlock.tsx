'use client';

import { useDraggable } from '@dnd-kit/core';
import { Lock } from 'lucide-react';
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
import { CATEGORY_META, type Task } from '@/types';

/** Tutamaç şeritlerinin yüksekliği (px). Dokunmatikte de yakalanabilir. */
const HANDLE_PX = 7;

/** Üst tutamağın gösterileceği en küçük blok süresi (dk). */
const TOP_HANDLE_MIN_DURATION = 45;

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
        height: Math.max(height - 2, 16),
        left: `${lane * laneWidth}%`,
        width: `calc(${laneWidth}% - 3px)`,
      }}
      className={cn(
        'pointer-events-auto absolute flex flex-col overflow-hidden rounded-md text-left',
        'transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
        meta.surface,
        meta.border,
        isDragging ? 'z-40 shadow-lg ring-1 ring-foreground/20' : 'z-10 hover:shadow-sm',
        isSelected && !isDragging && 'ring-2 ring-foreground ring-offset-1 ring-offset-canvas',
        task.isCompleted && 'opacity-60',
      )}
    >
      {/* Kategori şeridi — kimlik rengi burada tam doygunlukta görünür. */}
      {!isBuffer && (
        <span
          className={cn('absolute inset-y-0 left-0 w-[3px]', meta.bg)}
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
          'flex min-h-0 flex-1 touch-none flex-col overflow-hidden pl-2.5 pr-2',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          isCompact ? 'justify-center' : 'justify-start pt-1',
          !showTopHandle && !isCompact && 'pt-1.5',
        )}
      >
        <span className="flex w-full items-center gap-1.5">
          <span
            className={cn(
              'truncate text-[13px] font-medium leading-tight',
              isBuffer && 'text-muted-foreground',
              task.isCompleted && 'line-through decoration-1',
            )}
          >
            {task.title}
          </span>
          {task.isFixed && (
            <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Sabit" />
          )}
          {isCompact && !isDragging && (
            <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
              {formatDuration(duration)}
            </span>
          )}
        </span>

        {!isCompact && (
          <span className="font-mono text-[10px] leading-tight text-muted-foreground">
            {startLabel} – {endLabel}
            <span className="mx-1 opacity-50">·</span>
            {formatDuration(duration)}
          </span>
        )}
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
        <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-now px-1.5 py-0.5 font-mono text-[10px] leading-none text-now-contrast">
          {startLabel} – {endLabel}
        </span>
      )}
    </div>
  );
}
