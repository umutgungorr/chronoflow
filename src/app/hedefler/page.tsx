'use client';

import { useState } from 'react';
import { isToday } from 'date-fns';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Target,
} from 'lucide-react';

import { AuthGate } from '@/components/auth/AuthGate';
import { DailyGoalsBox } from '@/components/goals/DailyGoalsBox';
import { FixActivitiesBox } from '@/components/goals/FixActivitiesBox';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalModal, type GoalEditorState } from '@/components/goals/GoalModal';
import { AppShell } from '@/components/layout/AppShell';
import { FlowToast } from '@/components/layout/FlowToast';
import { SyncBridge } from '@/components/layout/SyncStatus';
import { useCurrentMinute } from '@/hooks/use-current-minute';
import { useDayRollover } from '@/hooks/use-day-rollover';
import { useHydratedStore } from '@/hooks/use-hydrated-store';
import { useUndoShortcut } from '@/hooks/use-undo-shortcut';
import { useVisitLog } from '@/hooks/use-visit-log';
import { sortGoals } from '@/lib/goals';
import { formatDayLabel } from '@/lib/time';
import { useTaskStore } from '@/store/useTaskStore';

export default function HedeflerPage() {
  return (
    <AuthGate>
      <AppShell>
        <GoalsWorkspace />
      </AppShell>
    </AuthGate>
  );
}

function GoalsWorkspace() {
  const hydrated = useHydratedStore();
  useUndoShortcut();
  useDayRollover();
  useVisitLog();
  useCurrentMinute();

  const selectedDate = useTaskStore((s) => s.selectedDate);
  const goToPrevDay = useTaskStore((s) => s.goToPrevDay);
  const goToNextDay = useTaskStore((s) => s.goToNextDay);
  const goToToday = useTaskStore((s) => s.goToToday);

  const goals = useTaskStore((s) => s.goals ?? []);
  const deleteGoal = useTaskStore((s) => s.deleteGoal);
  const addGoalBlock = useTaskStore((s) => s.addGoalBlock);

  const [editor, setEditor] = useState<GoalEditorState>(null);
  const [showLongTerm, setShowLongTerm] = useState(false);

  const now = new Date();
  const isSelectedToday = isToday(selectedDate);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-12 pt-6 sm:px-6">
      {hydrated ? (
        <>
          <SyncBridge />

          {/* Notion Tarzı Temiz Üst Başlık & Kontrol Çubuğu */}
          <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl" role="img" aria-label="Target">
                  🎯
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Hedefler & Rutinler
                </h1>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Notion tarzı günlük hedeflerini gir, tikle ve fix aktivitelerini ayrı ayrı yönet.
              </p>
            </div>

            {/* Gün Değiştirme / Bugün Seçici Kapsülü */}
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

              {!isSelectedToday && (
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-xl border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
                >
                  Bugün
                </button>
              )}
            </div>
          </header>

          {/* 2 FARKLI KUTUCUK (Yan yana 2 Kolonlu Notion Alanı) */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            {/* 1. KUTU: GÜNLÜK HEDEFLER (Notion To-Do Checklist) */}
            <DailyGoalsBox />

            {/* 2. KUTU: FİX AKTİVİTELER (Sabit Alışkanlıklar & Rutinler) */}
            <FixActivitiesBox />
          </div>

          {/* Uzun Vadeli Geri Sayım Hedefleri (Notion Tarzı İsteğe Bağlı Akordiyon) */}
          <div className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0b1117]/60 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowLongTerm(!showLongTerm)}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <Target className="size-4 text-primary/70" />
                <span>Uzun Vadeli Hedefler & Geri Sayımlar ({goals.length})</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    showLongTerm ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setEditor({ mode: 'create' })}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3.5" />
                Yeni Uzun Vadeli Hedef
              </button>
            </div>

            {showLongTerm && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                {goals.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">
                    Kayıtlı uzun vadeli hedef bulunmuyor.
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {sortGoals(goals, now).map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        now={now}
                        onEdit={(g) => setEditor({ mode: 'edit', goal: g })}
                        onDelete={deleteGoal}
                        onSchedule={(g) => addGoalBlock(g.title)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <GoalModal editor={editor} onClose={() => setEditor(null)} />
          <FlowToast />
        </>
      ) : (
        <div className="space-y-4 pt-6">
          <div className="h-8 w-64 rounded-xl bg-muted/60" />
          <div className="h-4 w-96 rounded-lg bg-muted/40" />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-2xl border border-white/[0.08] bg-[#0b1117]" />
            <div className="h-80 rounded-2xl border border-white/[0.08] bg-[#0b1117]" />
          </div>
        </div>
      )}
    </main>
  );
}
