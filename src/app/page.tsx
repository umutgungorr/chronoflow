'use client';

import { AuthGate } from '@/components/auth/AuthGate';
import { AppHeader } from '@/components/layout/AppHeader';
import { CategoryLegend } from '@/components/layout/CategoryLegend';
import { FlowToast } from '@/components/layout/FlowToast';
import { MagicScheduleInput } from '@/components/layout/MagicScheduleInput';
import { SyncBridge } from '@/components/layout/SyncStatus';
import { DailyStats } from '@/components/stats/DailyStats';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TimelineGrid } from '@/components/timeline/TimelineGrid';
import { useHydratedStore } from '@/hooks/use-hydrated-store';
import { useUndoShortcut } from '@/hooks/use-undo-shortcut';
import { useVisitLog } from '@/hooks/use-visit-log';

export default function Home() {
  return (
    <AuthGate>
      <Planner />
    </AuthGate>
  );
}

function Planner() {
  const hydrated = useHydratedStore();
  useUndoShortcut();
  useVisitLog();

  return (
    <main className="mx-auto flex h-dvh w-full max-w-6xl flex-col px-4 pb-4 pt-5 sm:px-6 sm:pb-6">
      {hydrated ? (
        <>
          {/* Senkron yalnızca localStorage okunduktan SONRA başlar. */}
          <SyncBridge />
          <AppHeader />
          <MagicScheduleInput />

          {/* Geniş ekranda analiz paneli sağda; darda ızgara tüm alanı alır,
              özet bilgi başlıktaki planlı/tampon/boş satırında zaten var. */}
          <div className="flex min-h-0 flex-1 gap-4">
            <TimelineGrid />
            <aside className="hidden w-72 shrink-0 overflow-y-auto lg:block">
              <DailyStats />
            </aside>
          </div>

          <CategoryLegend />
          <TaskModal />
          <FlowToast />
        </>
      ) : (
        <TimelineSkeleton />
      )}
    </main>
  );
}

/**
 * localStorage okunana kadar gösterilir (bkz. useHydratedStore).
 * Takvimin iskeletini birebir taklit eder, böylece içerik geldiğinde
 * sayfa zıplamaz.
 */
function TimelineSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-2.5 w-24 rounded bg-muted" />
          <div className="h-7 w-56 rounded bg-muted" />
          <div className="h-3 w-44 rounded bg-muted" />
        </div>
        <div className="h-8 w-48 rounded-md bg-muted" />
      </div>
      <div className="h-9 rounded-md bg-muted" />
      <div className="mt-3 flex min-h-0 flex-1 gap-4">
        <div className="flex-1 rounded-xl border bg-canvas" />
        <div className="hidden w-72 shrink-0 rounded-xl border bg-canvas lg:block" />
      </div>
      <div className="h-8" />
    </>
  );
}
