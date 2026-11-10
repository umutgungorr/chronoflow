'use client';

import { isToday } from 'date-fns';
import { BarChart3, Disc, Plus, Settings, Zap } from 'lucide-react';
import Link from 'next/link';

import { useDayToolsStore } from '@/components/layout/DayToolsSheet';
import { findFreeSlots, getAvailableDuration } from '@/lib/scheduler';
import { formatDuration, getDurationMinutes, toDayMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore, useTasksForSelectedDay } from '@/store/useTaskStore';
import { CATEGORY_META, type TaskCategory } from '@/types';

const RING_SIZE = 116;
const RING_RADIUS = 46;
const RING_STROKE = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const FALLBACK_CATEGORIES: TaskCategory[] = ['WORK', 'SOCIAL', 'ROUTINE'];

type Props = {
  /**
   * Panelden bir bloğa veya işleme gidildiğinde çağrılır. Telefonda kadran alttan
   * açılan bir panelde durduğu için, düzenleme penceresi açılırken o panelin
   * kapanması gerekiyor — yoksa modal panelin arkasında kalır.
   */
  onNavigate?: () => void;
};

export function DailyStats({ onNavigate }: Props = {}) {
  const tasks = useTasksForSelectedDay();
  const allTasks = useTaskStore((s) => s.tasks);
  const day = useTaskStore((s) => s.selectedDate);
  const openCreateEditor = useTaskStore((s) => s.openCreateEditor);
  const setDayToolsOpen = useDayToolsStore((s) => s.setOpen);

  const activeTasks = tasks.filter((t) => t.category !== 'BUFFER');
  const completedCount = activeTasks.filter((t) => t.isCompleted).length;
  const completionRate =
    activeTasks.length > 0 ? Math.round((completedCount / activeTasks.length) * 100) : 0;

  // Kategori kırılımı — kullanılanlar azalan sırayla; hiç blok yoksa örnek satırlar.
  const byCategory = tasks.reduce<Partial<Record<TaskCategory, number>>>((acc, task) => {
    if (task.category === 'BUFFER') return acc;
    acc[task.category] = (acc[task.category] ?? 0) + getDurationMinutes(task);
    return acc;
  }, {});

  const breakdown = (Object.entries(byCategory) as [TaskCategory, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  const displayRows: [TaskCategory, number][] =
    breakdown.length > 0
      ? breakdown.slice(0, 4)
      : FALLBACK_CATEGORIES.map((cat) => [cat, 0]);

  const progressLength = (completionRate / 100) * RING_CIRCUMFERENCE;

  const handleQuickAdd = () => {
    const from = isToday(day) ? toDayMinutes(new Date()) : 9 * 60;
    const slot =
      findFreeSlots(allTasks, day, { from, minDuration: 30 })[0] ??
      findFreeSlots(allTasks, day, { minDuration: 30 })[0];
    const start = slot ? slot.start : from;
    openCreateEditor(start, getAvailableDuration(allTasks, day, start, 60));
    onNavigate?.();
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* 1. KART: Günlük Dağılım + Motivasyon */}
      <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-[#0b1117]/90 p-5 shadow-[0_0_40px_-20px_var(--primary)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Günlük Dağılım</h2>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span
              className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
              aria-hidden
            />
            %{completionRate} tamamlandı
          </span>
        </div>

        <div className="flex items-center gap-5 py-1">
          {/* Sol: Dairesel tamamlanma halkası */}
          <div
            className="relative shrink-0"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          >
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              aria-hidden
              style={{ filter: 'drop-shadow(0 0 10px rgba(46, 230, 184, 0.22))' }}
            >
              <g transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}>
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeWidth={RING_STROKE}
                />
                {completionRate > 0 && (
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    strokeDasharray={`${progressLength} ${RING_CIRCUMFERENCE - progressLength}`}
                    className="transition-all duration-500 ease-out"
                  />
                )}
              </g>
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold leading-none text-foreground">
                {completionRate}%
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground">Tamamlandı</span>
            </div>
          </div>

          {/* Sağ: Kategori kırılım listesi */}
          <ul className="flex-1 space-y-2.5">
            {displayRows.map(([category, minutes]) => {
              const meta = CATEGORY_META[category];
              return (
                <li key={category} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn('size-2 shrink-0 rounded-full', meta.bg)}
                    aria-hidden
                  />
                  <span className="truncate text-muted-foreground">{meta.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs font-medium text-foreground">
                    {formatDuration(minutes)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Alt Motivasyon / Durum Bandı */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary shadow-[0_0_16px_rgba(46,230,184,0.25)]"
              aria-hidden
            >
              <Zap className="size-4 fill-primary/20" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {activeTasks.length === 0
                  ? 'Günü planlamaya hazır mısın?'
                  : completionRate >= 50
                    ? 'Harika gidiyorsun!'
                    : 'Adım adım ilerliyorsun!'}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {activeTasks.length === 0
                  ? 'İlk bloğunu ekleyerek akışı başlat.'
                  : `Bugünün planını %${completionRate} tamamladın.`}
              </p>
            </div>
          </div>

          <svg
            viewBox="0 0 48 28"
            className="h-6 w-11 shrink-0 text-primary drop-shadow-[0_0_6px_rgba(46,230,184,0.45)]"
            fill="none"
            aria-hidden
          >
            <path
              d="M3 23L15 15L24 19L43 5M43 5H34M43 5V14"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </section>

      {/* 2. KART: Hızlı İşlemler */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0b1117]/90 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Hızlı İşlemler</h2>
          <button
            type="button"
            onClick={() => {
              setDayToolsOpen(true);
              onNavigate?.();
            }}
            className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
          >
            Tümünü Gör →
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={handleQuickAdd}
            className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-1.5 py-3 text-center transition-all hover:border-primary/40 hover:bg-primary/10"
          >
            <Plus className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="text-[10px] font-medium leading-tight text-muted-foreground group-hover:text-foreground">
              Yeni Plan Oluştur
            </span>
          </button>

          <Link
            href="/hafta"
            onClick={() => onNavigate?.()}
            className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-1.5 py-3 text-center transition-all hover:border-primary/40 hover:bg-primary/10"
          >
            <BarChart3 className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="text-[10px] font-medium leading-tight text-muted-foreground group-hover:text-foreground">
              Raporları Gör
            </span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setDayToolsOpen(true);
              onNavigate?.();
            }}
            className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-1.5 py-3 text-center transition-all hover:border-primary/40 hover:bg-primary/10"
          >
            <Settings className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="text-[10px] font-medium leading-tight text-muted-foreground group-hover:text-foreground">
              Ayarlar
            </span>
          </button>

          <Link
            href="/odak"
            onClick={() => onNavigate?.()}
            className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-1.5 py-3 text-center transition-all hover:border-primary/40 hover:bg-primary/10"
          >
            <Disc className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="text-[10px] font-medium leading-tight text-muted-foreground group-hover:text-foreground">
              Odak Modu
            </span>
          </Link>
        </div>
      </section>

      {/* 3. KART: Günün Sözü */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1117]/90 p-5 backdrop-blur">
        <div className="relative z-10 max-w-[220px]">
          <p className="text-sm font-medium leading-snug text-foreground/95">
            “Büyük hedefler,
            <br />
            iyi bir planla başlar.”
          </p>
          <p className="mt-2.5 text-[11px] text-muted-foreground">— ChronoFlow</p>
        </div>

        {/* Sağ alt turkuaz dalga dekorasyonu */}
        <svg
          viewBox="0 0 260 90"
          className="pointer-events-none absolute bottom-0 right-0 h-20 w-48 opacity-85"
          fill="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="quoteWaveGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(46, 230, 184, 0)" />
              <stop offset="55%" stopColor="rgba(46, 230, 184, 0.22)" />
              <stop offset="100%" stopColor="rgba(46, 230, 184, 0.7)" />
            </linearGradient>
            <linearGradient id="quoteWaveFill" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="rgba(46, 230, 184, 0.18)" />
              <stop offset="100%" stopColor="rgba(46, 230, 184, 0)" />
            </linearGradient>
          </defs>
          <path
            d="M20 90 C 90 85, 140 25, 260 12 L 260 90 Z"
            fill="url(#quoteWaveFill)"
          />
          <path
            d="M20 90 C 90 85, 140 25, 260 12"
            stroke="url(#quoteWaveGrad)"
            strokeWidth="2"
          />
          <path
            d="M70 90 C 130 82, 175 45, 260 32"
            stroke="url(#quoteWaveGrad)"
            strokeWidth="1.2"
            strokeOpacity="0.55"
          />
        </svg>
      </section>
    </div>
  );
}
