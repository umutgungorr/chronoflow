'use client';

import { useMemo, useState } from 'react';
import { addDays, format, isSameDay, isToday, startOfDay, startOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar, Check, Plus, Sparkles, TrendingUp, Trophy } from 'lucide-react';

import {
  getDayItems,
  getDayStats,
  type DayItem,
  type MotivationData,
} from '@/lib/motivation';
import { dayKey } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';

type Props = {
  data: MotivationData;
  now: Date;
  selectedDate: Date;
  onSelectDay?: (day: Date) => void;
};

export function WeeklyProgressGrid({ data, now, selectedDate, onSelectDay }: Props) {
  const toggleDailyGoal = useTaskStore((s) => s.toggleDailyGoal);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const toggleRoutineCompleted = useTaskStore((s) => s.toggleRoutineCompleted);
  const addDailyGoal = useTaskStore((s) => s.addDailyGoal);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const today = useMemo(() => startOfDay(now), [now]);
  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const daysData = useMemo(
    () =>
      weekDays.map((day) => {
        const items = getDayItems(data, day, today);
        return {
          day,
          key: dayKey(day),
          dayLabel: format(day, 'EEE', { locale: tr }),
          dateLabel: format(day, 'd MMM', { locale: tr }),
          isCurrentDay: isSameDay(day, selectedDate),
          isTodayDay: isToday(day),
          items,
          ...getDayStats(items),
        };
      }),
    [weekDays, data, today, selectedDate],
  );

  const totalWeeklyItems = daysData.reduce((sum, d) => sum + d.total, 0);
  const totalWeeklyCompleted = daysData.reduce((sum, d) => sum + d.completed, 0);
  const weeklyRate =
    totalWeeklyItems > 0 ? Math.round((totalWeeklyCompleted / totalWeeklyItems) * 100) : 0;

  const bestDay = useMemo(() => {
    const withItems = daysData.filter((d) => d.total > 0);
    if (withItems.length === 0) return null;
    return [...withItems].sort((a, b) => b.rate - a.rate)[0];
  }, [daysData]);

  /** Tek yerden tikleme: hedef, blok ve rutin için doğru store aksiyonunu seçer. */
  const toggleItem = (item: DayItem, key: string) => {
    const next = !item.isCompleted;
    if (item.kind === 'goal') {
      toggleDailyGoal(item.id);
      return;
    }
    if (item.kind === 'task') {
      toggleComplete(item.id);
      return;
    }
    // Rutin: hem rutinin kendi tiki hem (varsa) takvimdeki bloğu aynı yöne gider.
    if ((item.routineDone ?? false) !== next) toggleRoutineCompleted(item.id, key);
    if (item.taskId && (item.taskDone ?? false) !== next) toggleComplete(item.taskId);
  };

  const submitDraft = (key: string) => {
    const title = (drafts[key] ?? '').trim();
    if (!title) return;
    addDailyGoal({ title, date: key });
    setDrafts((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* HAFTALIK ÖZET */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-5 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-[0_0_12px_rgba(46,230,184,0.25)]">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">Haftalık Gidişat</h2>
              <p className="text-xs text-muted-foreground">
                {format(weekDays[0], 'd MMMM', { locale: tr })} –{' '}
                {format(weekDays[6], 'd MMMM', { locale: tr })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono text-xs">
            <span className="text-muted-foreground">Haftalık:</span>
            <span className="font-bold text-foreground">
              {totalWeeklyCompleted}/{totalWeeklyItems}
            </span>
            <span className="rounded bg-primary/20 px-1.5 py-0.5 font-bold text-primary">
              %{weeklyRate}
            </span>
          </div>
        </div>

        <div className="pt-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Haftalık tamamlama oranı</span>
            <span className="font-mono font-bold text-primary">%{weeklyRate}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/50 via-primary to-[#5eead4] shadow-[0_0_12px_var(--primary)] transition-all duration-1000 ease-out"
              style={{ width: `${weeklyRate}%` }}
            />
          </div>
        </div>

        {bestDay && (
          <div className="mt-4 flex items-center gap-1.5 font-mono text-[11px] text-primary">
            <Trophy className="size-3.5" />
            <span>
              En iyi gün: {bestDay.dayLabel} (%{bestDay.rate})
            </span>
          </div>
        )}
      </div>

      {/* 7 GÜNLÜK KUTUCUKLAR */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-5 shadow-lg backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Hafta (Pzt – Paz)
            </h3>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="size-3" />
            Hedefler, takvim blokları ve fix aktiviteler birlikte sayılır
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {daysData.map((d) => (
            <div
              key={d.key}
              onClick={() => onSelectDay?.(d.day)}
              className={cn(
                'flex cursor-pointer flex-col rounded-xl border p-3 transition-all',
                d.isCurrentDay
                  ? 'border-primary/60 bg-primary/[0.08] shadow-[0_0_16px_rgba(46,230,184,0.2)] ring-1 ring-primary/40'
                  : 'border-white/[0.06] bg-[#070c10]/90 hover:border-white/[0.15] hover:bg-[#0c131c]',
              )}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div>
                  <span className="text-xs font-bold capitalize text-foreground">{d.dayLabel}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    {d.dateLabel}
                  </span>
                </div>
                {d.isTodayDay && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary shadow-[0_0_8px_var(--primary)]">
                    Bugün
                  </span>
                )}
              </div>

              <div className="my-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {d.completed}/{d.total}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[10px] font-bold transition-colors duration-500',
                      d.rate === 100
                        ? 'text-primary'
                        : d.rate > 0
                          ? 'text-foreground'
                          : 'text-muted-foreground/60',
                    )}
                  >
                    %{d.rate}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-primary shadow-[0_0_8px_var(--primary)] transition-all duration-1000 ease-out"
                    style={{ width: `${d.rate}%` }}
                  />
                </div>
              </div>

              <div className="flex min-h-[60px] flex-col gap-1.5">
                {d.items.length === 0 ? (
                  <span className="py-3 text-center text-[10px] italic text-muted-foreground/50">
                    Hedef yok
                  </span>
                ) : (
                  d.items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItem(item, d.key);
                      }}
                      title={item.title}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] transition-all',
                        item.isCompleted
                          ? 'border-primary/50 bg-primary/20 text-foreground shadow-[0_0_10px_rgba(46,230,184,0.2)]'
                          : 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-3.5 shrink-0 items-center justify-center rounded border transition-all',
                          item.isCompleted
                            ? 'border-primary bg-primary font-bold text-background'
                            : 'border-white/30',
                        )}
                      >
                        {item.isCompleted && <Check className="size-2.5 stroke-[3]" />}
                      </span>
                      <span className={cn('truncate', item.isCompleted && 'line-through opacity-75')}>
                        {item.title}
                      </span>
                      {item.kind === 'routine' && (
                        <span className="ml-auto shrink-0 rounded bg-white/[0.06] px-1 font-mono text-[8px] text-muted-foreground">
                          FİX
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Yerinde hedef ekleme */}
              <form
                className="mt-2 flex items-center gap-1 rounded-lg border border-white/[0.07] bg-[#05080c] px-2 py-1 focus-within:border-primary/50"
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitDraft(d.key);
                }}
              >
                <button
                  type="submit"
                  aria-label={`${d.dayLabel} gününe hedef ekle`}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <Plus className="size-3.5" />
                </button>
                <input
                  type="text"
                  value={drafts[d.key] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [d.key]: e.target.value }))}
                  placeholder="Hedef ekle"
                  maxLength={150}
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
