'use client';

import { useState } from 'react';
import { isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, PieChart, Plus } from 'lucide-react';

import { AppNav } from '@/components/layout/AppNav';
import { DayTitle } from '@/components/layout/DayTitle';
import { DailyStats } from '@/components/stats/DailyStats';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DAY_END_MINUTE } from '@/lib/constants';
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

  /*
   * Kadran geniş ekranda sağ panelde duruyor. Telefonda oraya yer yok ve
   * ızgaranın altına koymak dikey alanı yer — 24 saatlik bir takvimde en
   * kıymetli şey yükseklik. Bu yüzden alttan açılan panele koyuyoruz:
   * özet satırına dokununca geliyor, kapanınca ızgara tüm alanı geri alıyor.
   */
  const [ozetAcik, setOzetAcik] = useState(false);

  const plannedMinutes = tasks
    .filter((t) => t.category !== 'BUFFER')
    .reduce((sum, t) => sum + getDurationMinutes(t), 0);
  const bufferMinutes = tasks
    .filter((t) => t.category === 'BUFFER')
    .reduce((sum, t) => sum + getDurationMinutes(t), 0);
  const freeMinutes = DAY_END_MINUTE - plannedMinutes - bufferMinutes;

  /** Klavye ile ekleme yolu: şu andan sonraki ilk uygun boşlukla pencereyi açar. */
  const openEditorAtNextFreeSlot = () => {
    const from = isToday(day) ? toDayMinutes(new Date()) : 9 * 60;
    const slot =
      findFreeSlots(allTasks, day, { from, minDuration: 30 })[0] ??
      findFreeSlots(allTasks, day, { minDuration: 30 })[0];
    const start = slot ? slot.start : from;
    openCreateEditor(start, getAvailableDuration(allTasks, day, start, 60));
  };

  return (
    <header className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <AppNav />
        <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold leading-none tracking-[-0.03em]">
          {formatDayLabel(day)}
        </h1>
        <DayTitle />
        {/* Özet satırının kendisi düğme: telefonda dokununca kadranı açar.
            Geniş ekranda kadran zaten sağda durduğu için tıklanamaz olur. */}
        <button
          type="button"
          onClick={() => setOzetAcik(true)}
          aria-label="Günün dağılımını göster"
          className="flex items-center gap-1.5 rounded font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:pointer-events-none lg:hover:text-muted-foreground"
        >
          <span>
            {formatDuration(plannedMinutes)} planlı
            <span className="mx-1.5 opacity-40">·</span>
            {formatDuration(bufferMinutes)} tampon
            <span className="mx-1.5 opacity-40">·</span>
            {formatDuration(freeMinutes)} boş
          </span>
          <PieChart className="size-3 shrink-0 opacity-70 lg:hidden" aria-hidden />
        </button>
      </div>

      <Sheet open={ozetAcik} onOpenChange={setOzetAcik}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Günün dağılımı</SheetTitle>
          </SheetHeader>
          <div className="mx-auto w-full max-w-sm pb-6">
            <DailyStats onNavigate={() => setOzetAcik(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md border bg-canvas">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-r-none"
            onClick={goToPrevDay}
            aria-label="Önceki gün"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-none border-x px-3 text-xs font-medium"
            onClick={goToToday}
            disabled={isToday(day)}
          >
            Bugün
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-l-none"
            onClick={goToNextDay}
            aria-label="Sonraki gün"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <Button
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs"
          onClick={openEditorAtNextFreeSlot}
        >
          <Plus className="size-3.5" />
          Blok ekle
        </Button>
      </div>
    </header>
  );
}
