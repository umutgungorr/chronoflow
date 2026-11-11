'use client';

import { useMemo } from 'react';
import {
  Award,
  Check,
  Flame,
  Sparkles,
  Zap,
} from 'lucide-react';

import { dayKey, getDurationMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTasksForSelectedDay, useTaskStore } from '@/store/useTaskStore';

type Props = {
  percent: number;
  completedCount: number;
  totalCount: number;
};

export function ProgressBoxes({ percent, completedCount, totalCount }: Props) {
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const tasks = useTasksForSelectedDay();
  const dailyGoals = useTaskStore((s) => s.dailyGoals ?? []);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const toggleDailyGoal = useTaskStore((s) => s.toggleDailyGoal);

  const currentKey = dayKey(selectedDate);
  const currentDailyGoals = dailyGoals.filter((g) => !g.date || g.date === currentKey);

  // Toplam XP hesabı: her tamamlanan hedef +25 XP, her tamamlanan blok +20 XP
  const xp = useMemo(() => {
    const goalsXp = currentDailyGoals.filter((g) => g.isCompleted).length * 25;
    const tasksXp = tasks.filter((t) => t.isCompleted).length * 20;
    return goalsXp + tasksXp;
  }, [currentDailyGoals, tasks]);

  const level = Math.floor(xp / 100) + 1;
  const xpInCurrentLevel = xp % 100;

  // 28 Günlük Aktivite Kutucukları Matrisi (GitHub Heatmap tarzı)
  const heatmapDays = useMemo(() => {
    const list = [];
    for (let i = 27; i >= 0; i--) {
      // Örnek simüle edilmiş yoğunluk (bugün gerçek veriden gelir)
      const isTodayBox = i === 0;
      const intensity = isTodayBox
        ? percent === 100
          ? 4
          : percent > 50
            ? 3
            : percent > 0
              ? 2
              : 0
        : (i * 7 + 3) % 5; // Hoş bir görsel dağılım
      list.push({ dayIndex: i, isToday: isTodayBox, intensity });
    }
    return list;
  }, [percent]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. SEVİYE & XP ÇUBUĞU */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Zap className="size-4 fill-primary/20" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">SEVİYE {level}</span>
                <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-primary">
                  {xp} XP
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {percent === 100 ? 'Maksimum verimlilik!' : `Sonraki seviyeye ${100 - xpInCurrentLevel} XP kaldı`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs text-primary font-bold">
            <Flame className="size-4 fill-primary/30" />
            <span>% {percent}</span>
          </div>
        </div>

        {/* İlerleme Barı */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary shadow-[0_0_12px_var(--primary)] transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 2. GÜNLÜK HEDEF KUTUCUKLARI (Interactive Quest Boxes) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Günün Görev Kutucukları
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-muted-foreground">
            {completedCount}/{totalCount} Tamamlandı
          </span>
        </div>

        {totalCount === 0 ? (
          <p className="text-center py-4 text-xs text-muted-foreground">
            Bugün için henüz görev veya hedef eklenmemiş.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Günlük Hedef Kutuları */}
            {currentDailyGoals.map((goal) => (
              <button
                key={`goal-${goal.id}`}
                type="button"
                onClick={() => toggleDailyGoal(goal.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all',
                  goal.isCompleted
                    ? 'border-primary/50 bg-primary/10 shadow-[0_0_14px_rgba(46,230,184,0.18)]'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.05]',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-md border text-xs transition-all',
                    goal.isCompleted
                      ? 'border-primary bg-primary text-primary-foreground font-bold shadow-[0_0_8px_var(--primary)]'
                      : 'border-white/30 text-transparent',
                  )}
                >
                  <Check className="size-3.5 stroke-[3]" />
                </span>
                <span
                  className={cn(
                    'truncate text-xs font-medium',
                    goal.isCompleted
                      ? 'text-foreground line-through opacity-75'
                      : 'text-foreground/90',
                  )}
                >
                  {goal.title}
                </span>
              </button>
            ))}

            {/* Zaman Blokları Kutuları */}
            {tasks
              .filter((t) => t.category !== 'BUFFER')
              .map((task) => (
                <button
                  key={`task-${task.id}`}
                  type="button"
                  onClick={() => toggleComplete(task.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all',
                    task.isCompleted
                      ? 'border-primary/50 bg-primary/10 shadow-[0_0_14px_rgba(46,230,184,0.18)]'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.05]',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md border text-xs transition-all',
                      task.isCompleted
                        ? 'border-primary bg-primary text-primary-foreground font-bold shadow-[0_0_8px_var(--primary)]'
                        : 'border-white/30 text-transparent',
                    )}
                  >
                    <Check className="size-3.5 stroke-[3]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-xs font-medium',
                        task.isCompleted
                          ? 'text-foreground line-through opacity-75'
                          : 'text-foreground/90',
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {getDurationMinutes(task)} dk blok
                    </span>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* 3. 28 GÜNLÜK VERİMLİLİK ISI HARİTASI (GitHub Style Activity Heatmap Grid) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Aktivite & Verimlilik Matrisi
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">Son 4 Hafta</span>
        </div>

        {/* 28 Kutucuklu Grid (7 gün x 4 hafta) */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 py-1">
          {heatmapDays.map((box, i) => {
            const bgClass =
              box.intensity === 4
                ? 'bg-primary shadow-[0_0_10px_var(--primary)]'
                : box.intensity === 3
                  ? 'bg-primary/75'
                  : box.intensity === 2
                    ? 'bg-primary/45'
                    : box.intensity === 1
                      ? 'bg-primary/20'
                      : 'bg-white/[0.05]';

            return (
              <div
                key={i}
                title={box.isToday ? `Bugün: %${percent} tamamlandı` : `Aktivite Seviyesi: ${box.intensity}/4`}
                className={cn(
                  'size-6 sm:size-7 rounded-md transition-all hover:scale-110 flex items-center justify-center font-mono text-[9px]',
                  bgClass,
                  box.isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-[#0b1117]',
                )}
              >
                {box.isToday && <span className="font-bold text-background">•</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-white/[0.05]">
          <span>Düşük</span>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-white/[0.05]" />
            <span className="size-2.5 rounded bg-primary/20" />
            <span className="size-2.5 rounded bg-primary/45" />
            <span className="size-2.5 rounded bg-primary/75" />
            <span className="size-2.5 rounded bg-primary shadow-[0_0_6px_var(--primary)]" />
          </div>
          <span>Zirve (Boss)</span>
        </div>
      </div>

      {/* 4. ROZETLER & MOTİVASYON */}
      <div className="grid grid-cols-2 gap-3">
        <div className={cn(
          'flex items-center gap-3 rounded-2xl border p-3.5 transition-all',
          percent === 100
            ? 'border-primary/50 bg-primary/10 shadow-[0_0_16px_rgba(46,230,184,0.2)]'
            : 'border-white/[0.07] bg-[#0b1117]/80 opacity-60',
        )}>
          <span className="text-2xl">🕶️</span>
          <div>
            <p className="text-xs font-bold text-foreground">Cool Boss Gözlüğü</p>
            <p className="text-[10px] text-muted-foreground">
              {percent === 100 ? 'AÇILDI: Stickman havalı!' : '%100 bitirince açılır'}
            </p>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-3 rounded-2xl border p-3.5 transition-all',
          completedCount > 0
            ? 'border-primary/50 bg-primary/10 shadow-[0_0_16px_rgba(46,230,184,0.2)]'
            : 'border-white/[0.07] bg-[#0b1117]/80 opacity-60',
        )}>
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-xs font-bold text-foreground">Hızlı Başlangıç</p>
            <p className="text-[10px] text-muted-foreground">
              {completedCount > 0 ? 'AÇILDI: İlk hedef bitti!' : 'İlk hedefini tamamla'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
