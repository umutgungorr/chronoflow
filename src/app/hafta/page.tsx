'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, isToday, startOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { AuthGate } from '@/components/auth/AuthGate';
import { AppNav } from '@/components/layout/AppNav';
import { SyncBridge } from '@/components/layout/SyncStatus';
import { Button } from '@/components/ui/button';
import { useDayRollover } from '@/hooks/use-day-rollover';
import { useHydratedStore } from '@/hooks/use-hydrated-store';
import { sortByStart } from '@/lib/scheduler';
import { formatDuration, formatTime, getDurationMinutes, isTaskOnDay } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';
import { CATEGORY_META } from '@/types';

export default function WeekPage() {
  return (
    <AuthGate>
      <Week />
    </AuthGate>
  );
}

function Week() {
  const hydrated = useHydratedStore();
  useDayRollover();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-10 pt-5 sm:px-6">
      {hydrated ? (
        <>
          <SyncBridge />
          <WeekBody />
        </>
      ) : null}
    </main>
  );
}

function WeekBody() {
  const router = useRouter();
  const tasks = useTaskStore((s) => s.tasks);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const setSelectedDate = useTaskStore((s) => s.setSelectedDate);

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const openDay = (day: Date) => {
    setSelectedDate(day);
    router.push('/');
  };

  return (
    <>
      <header className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <AppNav />
          <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold leading-none tracking-[-0.03em]">
            Hafta
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {format(days[0]!, 'd MMM', { locale: tr })} – {format(days[6]!, 'd MMM yyyy', { locale: tr })}
          </p>
        </div>
        <div className="flex items-center rounded-md border bg-canvas">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-r-none"
            onClick={() => setSelectedDate(addDays(weekStart, -7))}
            aria-label="Önceki hafta"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-none border-x px-3 text-xs font-medium"
            onClick={() => setSelectedDate(new Date())}
          >
            Bu hafta
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-l-none"
            onClick={() => setSelectedDate(addDays(weekStart, 7))}
            aria-label="Sonraki hafta"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <ol className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => {
          const dayTasks = sortByStart(tasks.filter((t) => isTaskOnDay(t, day)));
          const planned = dayTasks
            .filter((t) => t.category !== 'BUFFER')
            .reduce((sum, t) => sum + getDurationMinutes(t), 0);
          const today = isToday(day);

          return (
            <li
              key={day.toISOString()}
              className={cn('flex min-h-40 flex-col rounded-xl border bg-canvas', today && 'border-foreground/40')}
            >
              <button
                type="button"
                onClick={() => openDay(day)}
                className="flex items-baseline justify-between gap-2 border-b px-3 py-2 text-left transition-colors hover:bg-muted/50"
                aria-label={`${format(day, 'd MMMM EEEE', { locale: tr })} gününü aç`}
              >
                <span className={cn('text-sm font-medium capitalize', today && 'underline underline-offset-4')}>
                  {format(day, 'EEE d', { locale: tr })}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {planned > 0 ? formatDuration(planned) : '—'}
                </span>
              </button>

              {dayTasks.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground">Plan yok</p>
              ) : (
                <ul className="space-y-1 p-2">
                  {dayTasks.map((task) => {
                    const meta = CATEGORY_META[task.category];
                    return (
                      <li
                        key={task.id}
                        className={cn(
                          'flex gap-2 rounded-md border px-2 py-1.5 text-xs',
                          meta.surface,
                          task.isCompleted && 'opacity-50',
                        )}
                      >
                        <span className={cn('w-1 shrink-0 rounded-full', meta.bg)} aria-hidden />
                        <span className="min-w-0">
                          <span className={cn('block truncate font-medium', task.isCompleted && 'line-through')}>
                            {task.title}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatTime(task.startTime)}–{formatTime(task.endTime)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
