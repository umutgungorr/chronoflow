'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Coffee, Flame } from 'lucide-react';

import { AuthGate } from '@/components/auth/AuthGate';
import { AppShell } from '@/components/layout/AppShell';
import { SyncBridge } from '@/components/layout/SyncStatus';
import { SubtaskList } from '@/components/tasks/SubtaskList';
import { Button } from '@/components/ui/button';
import { useDayRollover } from '@/hooks/use-day-rollover';
import { useHydratedStore } from '@/hooks/use-hydrated-store';
import {
  findActiveTask,
  formatClock,
  pomodoroAt,
  secondsRemaining,
} from '@/lib/focus';
import { formatRange } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';
import { CATEGORY_META } from '@/types';

export default function FocusPage() {
  return (
    <AuthGate>
      <AppShell>
        <Focus />
      </AppShell>
    </AuthGate>
  );
}

function Focus() {
  const hydrated = useHydratedStore();
  useDayRollover();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 pb-10 pt-5 sm:px-6">
      {hydrated ? (
        <>
          <SyncBridge />
          <header className="space-y-1.5 pb-6">
            <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold leading-none tracking-[-0.03em]">
              Odak
            </h1>
          </header>
          <FocusBody />
        </>
      ) : null}
    </main>
  );
}

function FocusBody() {
  const tasks = useTaskStore((s) => s.tasks);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const active = useMemo(() => findActiveTask(tasks, now), [tasks, now]);

  if (!active) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
        <Flame className="size-6 text-muted-foreground/50" aria-hidden />
        <p className="text-sm text-muted-foreground">Şu anda süren bir blok yok.</p>
        <Button variant="outline" size="sm" render={<Link href="/" />}>
          Plana dön
        </Button>
      </div>
    );
  }

  const meta = CATEGORY_META[active.category];
  const elapsed = (now.getTime() - active.startTime.getTime()) / 1000;
  const pomodoro = pomodoroAt(elapsed);
  const remaining = secondsRemaining(active, now);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-canvas p-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {meta.emoji} {meta.label} · {formatRange(active)}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{active.title}</h2>

        <p
          className="mt-6 font-mono text-6xl font-semibold tabular-nums tracking-tight"
          aria-live="off"
        >
          {formatClock(remaining)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">bloğun bitmesine kalan</p>

        <div
          className={cn(
            'mx-auto mt-6 flex w-fit items-center gap-3 rounded-full border px-4 py-2',
            pomodoro.phase === 'break' && 'border-green-500/40 bg-green-500/10',
          )}
        >
          {pomodoro.phase === 'focus' ? (
            <Flame className="size-4" aria-hidden />
          ) : (
            <Coffee className="size-4" aria-hidden />
          )}
          <span className="text-sm font-medium">
            {pomodoro.phase === 'focus' ? 'Odaklan' : 'Mola'} · tur {pomodoro.cycle}
          </span>
          <span className="font-mono text-sm tabular-nums">{formatClock(pomodoro.remaining)}</span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Pomodoro: 25 dk odak, 5 dk mola — bloğun başlangıcından itibaren.
        </p>

        <Button className="mt-6 gap-1.5" onClick={() => toggleComplete(active.id)}>
          <Check className="size-4" />
          {active.isCompleted ? 'Tamamlandı işaretini kaldır' : 'Bloğu tamamla'}
        </Button>
      </section>

      <section className="rounded-xl border bg-canvas p-4">
        <SubtaskList taskId={active.id} />
      </section>
    </div>
  );
}
