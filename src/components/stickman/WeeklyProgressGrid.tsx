'use client';

import { useMemo } from 'react';
import { addDays, format, isSameDay, isToday, startOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Calendar,
  Check,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';

import { dayKey, isTaskOnDay } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';

type Props = {
  selectedDate: Date;
  onSelectDay?: (day: Date) => void;
};

export function WeeklyProgressGrid({ selectedDate, onSelectDay }: Props) {
  const tasks = useTaskStore((s) => s.tasks ?? []);
  const dailyGoals = useTaskStore((s) => s.dailyGoals ?? []);
  const toggleDailyGoal = useTaskStore((s) => s.toggleDailyGoal);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);

  // Pazartesi'den başlayan 7 gün
  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate],
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Günlük verilerin hesaplanması
  const daysData = useMemo(() => {
    return weekDays.map((day) => {
      const key = dayKey(day);
      const isCurrentDay = isSameDay(day, selectedDate);
      const isTodayDay = isToday(day);

      // O günün günlük hedefleri
      const goalsOnDay = dailyGoals.filter((g) => g.date === key);
      // O günün görev blokları
      const tasksOnDay = tasks.filter((t) => isTaskOnDay(t, day) && t.category !== 'BUFFER');

      const allItems = [
        ...goalsOnDay.map((g) => ({
          id: g.id,
          title: g.title,
          isCompleted: g.isCompleted,
          type: 'goal' as const,
        })),
        ...tasksOnDay.map((t) => ({
          id: t.id,
          title: t.title,
          isCompleted: t.isCompleted,
          type: 'task' as const,
        })),
      ];

      const total = allItems.length;
      const completed = allItems.filter((i) => i.isCompleted).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        day,
        key,
        dayLabel: format(day, 'EEE', { locale: tr }),
        dateLabel: format(day, 'd MMM', { locale: tr }),
        isCurrentDay,
        isTodayDay,
        items: allItems,
        total,
        completed,
        rate,
      };
    });
  }, [weekDays, selectedDate, dailyGoals, tasks]);

  // Haftalık Genel İstatistikler
  const totalWeeklyItems = daysData.reduce((sum, d) => sum + d.total, 0);
  const totalWeeklyCompleted = daysData.reduce((sum, d) => sum + d.completed, 0);
  const weeklyRate =
    totalWeeklyItems > 0
      ? Math.round((totalWeeklyCompleted / totalWeeklyItems) * 100)
      : 0;

  // En verimli gün
  const bestDay = useMemo(() => {
    const daysWithItems = daysData.filter((d) => d.total > 0);
    if (daysWithItems.length === 0) return null;
    return [...daysWithItems].sort((a, b) => b.rate - a.rate)[0];
  }, [daysData]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. HAFTALIK GİDİŞAT ÖZET KARTI */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-5 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-[0_0_12px_rgba(46,230,184,0.25)]">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">Haftalık Gidişat Analizi</h2>
              <p className="text-xs text-muted-foreground">
                {format(weekDays[0], 'd MMMM', { locale: tr })} –{' '}
                {format(weekDays[6], 'd MMMM', { locale: tr })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
        </div>

        {/* Haftalık İlerleme Trend Çubuğu */}
        <div className="pt-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Haftalık Hedef Tamamlama Oranı</span>
            <span className="font-mono font-bold text-primary">%{weeklyRate} Tamamlandı</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/50 via-primary to-[#5eead4] shadow-[0_0_12px_var(--primary)] transition-all duration-700 ease-out"
              style={{ width: `${weeklyRate}%` }}
            />
          </div>
        </div>

        {/* Gidişat Değerlendirmesi */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#070c10] p-3 text-xs">
          <div className="flex items-center gap-2 text-foreground/90">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span>
              {weeklyRate >= 80
                ? 'Hafta muazzam geçiyor! Stickman gözlüğü gururla taktı! 🔥'
                : weeklyRate >= 50
                  ? 'Gidişat çok iyi! Kalan günlerin kutucuklarını da doldurarak zirveye çıkabilirsin.'
                  : 'Hafta devam ediyor! Hedef kutucuklarını doldurmaya başlayarak atağa kalk.'}
            </span>
          </div>
          {bestDay && bestDay.total > 0 && (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-primary">
              <Trophy className="size-3.5" />
              <span>En İyi Gün: {bestDay.dayLabel} (%{bestDay.rate})</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. HAFTALIK GÜN KUTUCUKLARI (7 GÜN MATRİSİ) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-5 shadow-lg backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Haftanın Günlük Kutucukları (Pzt – Paz)
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Kutucuklara tıklayarak doğrudan tamamlayabilirsin
          </span>
        </div>

        {/* 7 Kolonlu Günlük Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-7">
          {daysData.map((d) => (
            <div
              key={d.key}
              onClick={() => onSelectDay?.(d.day)}
              className={cn(
                'flex flex-col rounded-xl border p-3 transition-all cursor-pointer',
                d.isCurrentDay
                  ? 'border-primary/60 bg-primary/[0.08] ring-1 ring-primary/40 shadow-[0_0_16px_rgba(46,230,184,0.2)]'
                  : 'border-white/[0.06] bg-[#070c10]/90 hover:border-white/[0.15] hover:bg-[#0c131c]',
              )}
            >
              {/* Gün Başlığı */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div>
                  <span className="text-xs font-bold capitalize text-foreground">
                    {d.dayLabel}
                  </span>
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

              {/* Günün Başarı Rozeti */}
              <div className="my-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {d.completed}/{d.total}
                </span>
                <span
                  className={cn(
                    'font-mono text-[10px] font-bold',
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

              {/* Hedef Kutucukları (Grid Boxes) */}
              <div className="flex flex-col gap-1.5 min-h-[90px]">
                {d.items.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center py-4">
                    <span className="text-[10px] text-muted-foreground/50 italic">
                      Hedef yok
                    </span>
                  </div>
                ) : (
                  d.items.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === 'goal') {
                          toggleDailyGoal(item.id);
                        } else {
                          toggleComplete(item.id);
                        }
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
                            ? 'border-primary bg-primary text-background font-bold'
                            : 'border-white/30',
                        )}
                      >
                        {item.isCompleted && <Check className="size-2.5 stroke-[3]" />}
                      </span>
                      <span
                        className={cn(
                          'truncate',
                          item.isCompleted && 'line-through opacity-75',
                        )}
                      >
                        {item.title}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
