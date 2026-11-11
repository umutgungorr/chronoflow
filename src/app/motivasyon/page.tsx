'use client';

import { useMemo } from 'react';
import { addWeeks, startOfWeek, addDays } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Frown,
  Target,
} from 'lucide-react';

import { AuthGate } from '@/components/auth/AuthGate';
import { AppShell } from '@/components/layout/AppShell';
import { FlowToast } from '@/components/layout/FlowToast';
import { SyncBridge } from '@/components/layout/SyncStatus';
import { Stickman3D } from '@/components/stickman/Stickman3D';
import { WeeklyProgressGrid } from '@/components/stickman/WeeklyProgressGrid';
import { useCurrentMinute } from '@/hooks/use-current-minute';
import { useDayRollover } from '@/hooks/use-day-rollover';
import { useHydratedStore } from '@/hooks/use-hydrated-store';
import { useUndoShortcut } from '@/hooks/use-undo-shortcut';
import { useVisitLog } from '@/hooks/use-visit-log';
import {
  getDayItems,
  getDayStats,
  getLevel,
  getStreak,
  getTotalXp,
  getWeekInsights,
  type MotivationData,
} from '@/lib/motivation';
import { formatDayLabel } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';

export default function MotivasyonPage() {
  return (
    <AuthGate>
      <AppShell>
        <MotivationWorkspace />
      </AppShell>
    </AuthGate>
  );
}

function MotivationWorkspace() {
  const hydrated = useHydratedStore();
  useUndoShortcut();
  useDayRollover();
  useVisitLog();
  const minute = useCurrentMinute();

  const selectedDate = useTaskStore((s) => s.selectedDate);
  const setSelectedDate = useTaskStore((s) => s.setSelectedDate);
  const goToToday = useTaskStore((s) => s.goToToday);

  const tasks = useTaskStore((s) => s.tasks);
  const dailyGoals = useTaskStore((s) => s.dailyGoals);
  const routines = useTaskStore((s) => s.routines);
  const routineCompleted = useTaskStore((s) => s.routineCompleted);

  // Dakikada bir yenilenir: gece yarısı geçince "bugün" kendiliğinden kayar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [minute]);

  const data: MotivationData = useMemo(
    () => ({
      tasks: tasks ?? [],
      dailyGoals: dailyGoals ?? [],
      routines: routines ?? [],
      routineCompleted: routineCompleted ?? {},
    }),
    [tasks, dailyGoals, routines, routineCompleted],
  );

  const stats = useMemo(
    () => getDayStats(getDayItems(data, selectedDate, now)),
    [data, selectedDate, now],
  );
  const streak = useMemo(() => getStreak(data, now), [data, now]);
  const xp = useMemo(() => getTotalXp(data, now), [data, now]);
  const { level, xpInLevel, xpForNext } = getLevel(xp);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);
  const streakDays = streak.current;
  const insights = useMemo(
    () => getWeekInsights(data, weekDays, now, streakDays),
    [data, weekDays, now, streakDays],
  );

  return (
    <main className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 pb-12 pt-6 sm:px-6">
      {hydrated ? (
        <>
          <SyncBridge />

          <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl" role="img" aria-label="Stickman">
                  🕶️
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Motivasyon
                </h1>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Hedeflerin, takvim bloklarının ve fix aktivitelerin tek yerde. Seri tutarsan karakter
                gelişir.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-1.5 backdrop-blur">
              <button
                type="button"
                onClick={() => setSelectedDate(addWeeks(selectedDate, -1))}
                title="Önceki hafta"
                className="flex size-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-foreground">
                <Calendar className="size-3.5 text-primary" />
                <span>{formatDayLabel(selectedDate)}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}
                title="Sonraki hafta"
                className="flex size-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="rounded-xl border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
              >
                Bugün
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* SOL: karakter, seviye, gerçek veriye dayalı geri bildirim */}
            <div className="flex flex-col gap-5 lg:col-span-5">
              <div className="flex flex-col items-center rounded-3xl border border-white/[0.08] bg-[#0b1117]/90 p-5 shadow-2xl backdrop-blur">
                <Stickman3D
                  percent={stats.rate}
                  totalGoals={stats.total}
                  completedGoals={stats.completed}
                  streak={streak.current}
                  level={level}
                />

                <div className="mt-4 w-full rounded-2xl border border-white/[0.06] bg-[#070c10] p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Seviye {level}</span>
                    <span className="font-mono text-muted-foreground">
                      {xpInLevel}/{xpForNext} XP · toplam {xp}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-primary shadow-[0_0_10px_var(--primary)] transition-all duration-1000 ease-out"
                      style={{ width: `${(xpInLevel / xpForNext) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Her tamamlanan kalem 20 XP. En uzun serin: {streak.best} gün. Gün, en az %70
                    tamamlanırsa seriye sayılır.
                  </p>
                </div>

                <div className="mt-3 w-full text-center text-xs text-muted-foreground">
                  {stats.total === 0
                    ? 'Seçili gün için hiçbir kalem yok.'
                    : stats.rate === 100
                      ? 'Bugün tamam. Gözlük hak edildi.'
                      : `${stats.completed}/${stats.total} tamamlandı; gözlük için ${stats.total - stats.completed} kalem kaldı.`}
                </div>
              </div>

              {/* Jenerik söz yerine veriye dayalı geri bildirim */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-4 shadow-lg backdrop-blur">
                <div className="flex items-center gap-1.5 pb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                  <Target className="size-3.5 text-primary" />
                  Bu haftanın net tablosu
                </div>
                <ul className="space-y-2">
                  {insights.map((insight) => {
                    const Icon =
                      insight.tone === 'good'
                        ? CheckCircle2
                        : insight.tone === 'warn'
                          ? AlertTriangle
                          : Frown;
                    return (
                      <li
                        key={insight.text}
                        className={cn(
                          'flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed',
                          insight.tone === 'good' && 'border-primary/30 bg-primary/10 text-foreground',
                          insight.tone === 'warn' && 'border-amber-400/30 bg-amber-400/10 text-foreground',
                          insight.tone === 'bad' && 'border-red-400/30 bg-red-400/10 text-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'mt-0.5 size-3.5 shrink-0',
                            insight.tone === 'good' && 'text-primary',
                            insight.tone === 'warn' && 'text-amber-300',
                            insight.tone === 'bad' && 'text-red-300',
                          )}
                        />
                        {insight.text}
                      </li>
                    );
                  })}
                </ul>
                {streak.current > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-orange-300">
                    <Flame className="size-3.5" />
                    {streak.current} günlük seri sürüyor.
                  </div>
                )}
              </div>
            </div>

            {/* SAĞ: haftalık gidişat, hedef + blok + fix aktivite birlikte */}
            <div className="flex flex-col gap-5 lg:col-span-7">
              <WeeklyProgressGrid
                data={data}
                now={now}
                selectedDate={selectedDate}
                onSelectDay={(day) => setSelectedDate(day)}
              />
            </div>
          </div>

          <FlowToast />
        </>
      ) : (
        <div className="space-y-4 pt-6">
          <div className="h-8 w-64 rounded-xl bg-muted/60" />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-96 rounded-3xl border border-white/[0.08] bg-[#0b1117] lg:col-span-5" />
            <div className="h-96 rounded-3xl border border-white/[0.08] bg-[#0b1117] lg:col-span-7" />
          </div>
        </div>
      )}
    </main>
  );
}
