'use client';

import { useState } from 'react';
import { Plus, Target } from 'lucide-react';

import { AuthGate } from '@/components/auth/AuthGate';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalModal, type GoalEditorState } from '@/components/goals/GoalModal';
import { AppNav } from '@/components/layout/AppNav';
import { FlowToast } from '@/components/layout/FlowToast';
import { SyncBridge } from '@/components/layout/SyncStatus';
import { Button } from '@/components/ui/button';
import { useCurrentMinute } from '@/hooks/use-current-minute';
import { useHydratedStore } from '@/hooks/use-hydrated-store';
import { useUndoShortcut } from '@/hooks/use-undo-shortcut';
import { useVisitLog } from '@/hooks/use-visit-log';
import { sortGoals } from '@/lib/goals';
import { useTaskStore } from '@/store/useTaskStore';

export default function HedeflerPage() {
  return (
    <AuthGate>
      <Goals />
    </AuthGate>
  );
}

function Goals() {
  const hydrated = useHydratedStore();
  useUndoShortcut();
  useVisitLog();

  const goals = useTaskStore((s) => s.goals);
  const deleteGoal = useTaskStore((s) => s.deleteGoal);
  const [editor, setEditor] = useState<GoalEditorState>(null);

  // Sayfa açık dururken gün değişirse geri sayım kendini güncellesin.
  // Değeri kullanmıyoruz; yalnızca dakikada bir yeniden render tetikliyor.
  useCurrentMinute();
  const now = new Date();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-10 pt-5 sm:px-6">
      {hydrated ? (
        <>
          <SyncBridge />

          <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <AppNav />
              <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold leading-none tracking-[-0.03em]">
                Hedefler
              </h1>
              <p className="font-mono text-xs text-muted-foreground">
                {goals.length === 0
                  ? 'henüz hedef yok'
                  : `${goals.length} hedef · en yakını üstte`}
              </p>
            </div>

            <Button
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={() => setEditor({ mode: 'create' })}
            >
              <Plus className="size-3.5" />
              Hedef ekle
            </Button>
          </header>

          {goals.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
              <Target className="size-6 text-muted-foreground/50" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Bir tarih koy, kalan süreyi burada takip et.
              </p>
              <Button variant="outline" size="sm" onClick={() => setEditor({ mode: 'create' })}>
                İlk hedefini ekle
              </Button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {sortGoals(goals, now).map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  now={now}
                  onEdit={(g) => setEditor({ mode: 'edit', goal: g })}
                  onDelete={deleteGoal}
                />
              ))}
            </ul>
          )}

          <GoalModal editor={editor} onClose={() => setEditor(null)} />
          <FlowToast />
        </>
      ) : (
        <div className="space-y-3 pt-5">
          <div className="h-2.5 w-24 rounded bg-muted" />
          <div className="h-7 w-40 rounded bg-muted" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-40 rounded-xl border bg-canvas" />
            <div className="h-40 rounded-xl border bg-canvas" />
          </div>
        </div>
      )}
    </main>
  );
}
