'use client';

import { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import { AuthGate } from '@/components/auth/AuthGate';
import { AppShell } from '@/components/layout/AppShell';
import { FlowToast } from '@/components/layout/FlowToast';
import { SyncBridge } from '@/components/layout/SyncStatus';
import { ProgressBoxes } from '@/components/stickman/ProgressBoxes';
import { StickmanFigure } from '@/components/stickman/StickmanFigure';
import { useCurrentMinute } from '@/hooks/use-current-minute';
import { useDayRollover } from '@/hooks/use-day-rollover';
import { useHydratedStore } from '@/hooks/use-hydrated-store';
import { useUndoShortcut } from '@/hooks/use-undo-shortcut';
import { useVisitLog } from '@/hooks/use-visit-log';
import { dayKey, formatDayLabel } from '@/lib/time';
import { useTasksForSelectedDay, useTaskStore } from '@/store/useTaskStore';

const MOTIVATION_QUOTES = [
  '“Disiplin, ne istediğin ile şu an ne istediğin arasındaki tercihtir.”',
  '“Büyük işler, bir dizi küçük işin bir araya gelmesiyle başarılır.” — Vincent Van Gogh',
  '“Bugün yapacağın küçük bir ilerleme, yarınki büyük zaferin temelidir.”',
  '“Zamanını planlayan, geleceğini yönetir.”',
  '“Başlamak için mükemmel olmak zorunda değilsin, ama mükemmel olmak için başlamak zorundasın.”',
];

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
  useCurrentMinute();

  const selectedDate = useTaskStore((s) => s.selectedDate);
  const goToPrevDay = useTaskStore((s) => s.goToPrevDay);
  const goToNextDay = useTaskStore((s) => s.goToNextDay);
  const goToToday = useTaskStore((s) => s.goToToday);

  const tasks = useTasksForSelectedDay();
  const dailyGoals = useTaskStore((s) => s.dailyGoals ?? []);

  const [quoteIdx, setQuoteIdx] = useState(0);

  const currentKey = dayKey(selectedDate);
  const activeDailyGoals = dailyGoals.filter((g) => !g.date || g.date === currentKey);
  const activeTasks = tasks.filter((t) => t.category !== 'BUFFER');

  const totalCount = activeDailyGoals.length + activeTasks.length;
  const completedCount =
    activeDailyGoals.filter((g) => g.isCompleted).length +
    activeTasks.filter((t) => t.isCompleted).length;

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const nextQuote = () => {
    setQuoteIdx((prev) => (prev + 1) % MOTIVATION_QUOTES.length);
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-12 pt-6 sm:px-6">
      {hydrated ? (
        <>
          <SyncBridge />

          {/* Üst Başlık & Tarih Gezintisi */}
          <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl" role="img" aria-label="Stickman">
                  🕶️
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Motivasyon & Stickman
                </h1>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Hedeflerini tamamla, stickman seviye atlasın ve güneş gözlüğünü taksın!
              </p>
            </div>

            {/* Gün Değiştirme */}
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-1 backdrop-blur">
              <button
                type="button"
                onClick={goToPrevDay}
                aria-label="Önceki gün"
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
                onClick={goToNextDay}
                aria-label="Sonraki gün"
                className="flex size-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>

              <button
                type="button"
                onClick={goToToday}
                className="rounded-xl border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
              >
                Bugün
              </button>
            </div>
          </header>

          {/* İKİ KOLONLU DÜZEN: SOLDA STICKMAN, SAĞDA İLERLEME KUTULARI */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* SOL: STICKMAN MERKEZİ (5 Kolon) */}
            <div className="flex flex-col gap-5 lg:col-span-5">
              <div className="flex flex-col items-center rounded-3xl border border-white/[0.08] bg-[#0b1117]/90 p-6 shadow-xl backdrop-blur">
                <StickmanFigure
                  percent={percent}
                  totalGoals={totalCount}
                  completedGoals={completedCount}
                />

                {/* İlerleme Durum Kartı */}
                <div className="mt-5 w-full rounded-2xl border border-white/[0.06] bg-[#070c10] p-4 text-center">
                  <div className="flex items-center justify-center gap-2 font-mono text-lg font-bold text-foreground">
                    <span>{completedCount} / {totalCount}</span>
                    <span className="text-primary">Hedef Bitti</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalCount === 0
                      ? 'Bugün için plan sayfasına gidip hedef ekleyebilirsin.'
                      : percent === 100
                        ? 'Tebrikler! Stickman tüm hedefler bittiği için havalı gözlüğünü taktı! 😎'
                        : `Gözlüğü takmaya ${totalCount - completedCount} hedef kaldı!`}
                  </p>
                </div>
              </div>

              {/* Motivasyon Sözü Kartı */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-5 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5" />
                    <span>GÜNÜN MOTİVASYONU</span>
                  </div>
                  <button
                    type="button"
                    onClick={nextQuote}
                    className="flex size-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                    title="Yeni söz getir"
                  >
                    <RefreshCw className="size-3" />
                  </button>
                </div>
                <p className="text-xs font-medium italic leading-relaxed text-foreground/90">
                  {MOTIVATION_QUOTES[quoteIdx]}
                </p>
              </div>
            </div>

            {/* SAĞ: KUTUCUKLAR İLE İLERLEME & METRİKLER (7 Kolon) */}
            <div className="flex flex-col gap-5 lg:col-span-7">
              <ProgressBoxes
                percent={percent}
                completedCount={completedCount}
                totalCount={totalCount}
              />
            </div>
          </div>

          <FlowToast />
        </>
      ) : (
        <div className="space-y-4 pt-6">
          <div className="h-8 w-64 rounded-xl bg-muted/60" />
          <div className="h-4 w-96 rounded-lg bg-muted/40" />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-96 rounded-3xl border border-white/[0.08] bg-[#0b1117] lg:col-span-5" />
            <div className="h-96 rounded-3xl border border-white/[0.08] bg-[#0b1117] lg:col-span-7" />
          </div>
        </div>
      )}
    </main>
  );
}
