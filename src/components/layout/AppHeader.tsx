'use client';

import { useState } from 'react';
import { isToday } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, PieChart, Plus } from 'lucide-react';

import { DayTitle } from '@/components/layout/DayTitle';
import { DayToolsSheet } from '@/components/layout/DayToolsSheet';
import { ViewTabs } from '@/components/layout/ViewTabs';
import { DailyStats } from '@/components/stats/DailyStats';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { findFreeSlots, getAvailableDuration } from '@/lib/scheduler';
import {
  formatDayLabel,
  formatDuration,
  getDurationMinutes,
  toDayMinutes,
} from '@/lib/time';
import { useTaskStore, useTasksForSelectedDay } from '@/store/useTaskStore';

export function AppHeader() {
  const tasks = useTasksForSelectedDay();
  const allTasks = useTaskStore((s) => s.tasks);
  const day = useTaskStore((s) => s.selectedDate);
  const goToPrevDay = useTaskStore((s) => s.goToPrevDay);
  const goToNextDay = useTaskStore((s) => s.goToNextDay);
  const goToToday = useTaskStore((s) => s.goToToday);
  const openCreateEditor = useTaskStore((s) => s.openCreateEditor);

  const [ozetAcik, setOzetAcik] = useState(false);

  const plannedMinutes = tasks
    .filter((t) => t.category !== 'BUFFER')
    .reduce((sum, t) => sum + getDurationMinutes(t), 0);

  /** İlk uygun boşlukla yeni blok penceresini açar. */
  const openEditorAtNextFreeSlot = () => {
    const from = isToday(day) ? toDayMinutes(new Date()) : 9 * 60;
    const slot =
      findFreeSlots(allTasks, day, { from, minDuration: 30 })[0] ??
      findFreeSlots(allTasks, day, { minDuration: 30 })[0];
    const start = slot ? slot.start : from;
    openCreateEditor(start, getAvailableDuration(allTasks, day, start, 60));
  };

  return (
    <header className="flex flex-col gap-2.5 pb-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#0b1117]/90 px-3.5 py-2.5 backdrop-blur">
        {/* Sol grup: < > okları, takvim ikonu + tarih + Bugün rozeti */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-full border border-white/[0.08] bg-[#070c10] p-0.5">
            <button
              type="button"
              onClick={goToPrevDay}
              aria-label="Önceki gün"
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={goToNextDay}
              aria-label="Sonraki gün"
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" aria-hidden />
            <h1 className="text-base font-semibold tracking-tight sm:text-lg">
              {formatDayLabel(day)}
            </h1>
            <ChevronRight className="size-3.5 text-muted-foreground/50" aria-hidden />
          </div>

          <button
            type="button"
            onClick={goToToday}
            className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
          >
            Bugün
          </button>

          <div className="hidden sm:block">
            <DayTitle />
          </div>
        </div>

        {/* Sağ grup: Görünüm sekmeleri + Blok ekle */}
        <div className="flex flex-wrap items-center gap-2">
          <ViewTabs />

          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3.5 text-xs shadow-[0_0_16px_-4px_var(--primary)]"
            onClick={openEditorAtNextFreeSlot}
          >
            <Plus className="size-3.5" />
            Blok ekle
          </Button>

          {/* Mobil özet tetikleyicisi */}
          <button
            type="button"
            onClick={() => setOzetAcik(true)}
            aria-label="Günün dağılımını göster"
            className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#070c10] px-2.5 py-1 font-mono text-[11px] text-muted-foreground lg:hidden"
          >
            <PieChart className="size-3 text-primary" aria-hidden />
            {formatDuration(plannedMinutes)}
          </button>
        </div>
      </div>

      <DayToolsSheet showTrigger={false} />

      <Sheet open={ozetAcik} onOpenChange={setOzetAcik}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Günlük dağılım</SheetTitle>
          </SheetHeader>
          <div className="mx-auto w-full max-w-sm pb-6">
            <DailyStats onNavigate={() => setOzetAcik(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
