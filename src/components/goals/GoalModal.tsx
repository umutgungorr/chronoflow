'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatRemaining, getGoalProgress, type Goal } from '@/lib/goals';
import { dayKey } from '@/lib/time';
import { useTaskStore } from '@/store/useTaskStore';

export type GoalEditorState = { mode: 'create' } | { mode: 'edit'; goal: Goal } | null;

type Props = {
  editor: GoalEditorState;
  onClose: () => void;
};

type FormState = {
  title: string;
  note: string;
  startDate: string;
  targetDate: string;
};

export function GoalModal({ editor, onClose }: Props) {
  if (!editor) return null;

  return editor.mode === 'create' ? (
    <GoalForm
      key="create"
      heading="Yeni hedef"
      submitLabel="Ekle"
      goal={null}
      initial={{
        title: '',
        note: '',
        startDate: dayKey(new Date()),
        targetDate: '',
      }}
      onClose={onClose}
    />
  ) : (
    <GoalForm
      key={editor.goal.id}
      heading="Hedefi düzenle"
      submitLabel="Kaydet"
      goal={editor.goal}
      initial={{
        title: editor.goal.title,
        note: editor.goal.note ?? '',
        startDate: editor.goal.startDate,
        targetDate: editor.goal.targetDate,
      }}
      onClose={onClose}
    />
  );
}

type FormProps = {
  heading: string;
  submitLabel: string;
  goal: Goal | null;
  initial: FormState;
  onClose: () => void;
};

function GoalForm({ heading, submitLabel, goal, initial, onClose }: FormProps) {
  const addGoal = useTaskStore((s) => s.addGoal);
  const updateGoal = useTaskStore((s) => s.updateGoal);
  const deleteGoal = useTaskStore((s) => s.deleteGoal);

  const [form, setForm] = useState<FormState>(initial);
  const patch = (changes: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...changes }));

  const gecerli = form.title.trim().length > 0 && form.targetDate.length === 10;

  // Canlı önizleme: kullanıcı tarihi yazarken sonucu hemen görsün.
  const onizleme = gecerli
    ? getGoalProgress(
        {
          id: 'onizleme',
          title: form.title,
          startDate: form.startDate,
          targetDate: form.targetDate,
        },
        new Date(),
      )
    : null;

  const handleSubmit = () => {
    if (!gecerli) return;
    const payload = {
      title: form.title.trim(),
      note: form.note.trim() || undefined,
      startDate: form.startDate || dayKey(new Date()),
      targetDate: form.targetDate,
    };
    if (goal) updateGoal(goal.id, payload);
    else addGoal(payload);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {onizleme
              ? `${formatRemaining(onizleme)} · %${Math.round(onizleme.remainingPercent)} kaldı`
              : 'Hedef tarihini gir, kalan süreyi hesaplayayım'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="goal-title">Hedef</Label>
            <Input
              id="goal-title"
              autoFocus
              value={form.title}
              placeholder="YKS 2027"
              onChange={(event) => patch({ title: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Hedef tarihi</Label>
              <Input
                id="goal-target"
                type="date"
                className="font-mono"
                value={form.targetDate}
                onChange={(event) => patch({ targetDate: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-start">Başlangıç</Label>
              <Input
                id="goal-start"
                type="date"
                className="font-mono"
                value={form.startDate}
                onChange={(event) => patch({ startDate: event.target.value })}
              />
              <p className="text-[11px] leading-snug text-muted-foreground">
                Yüzde buradan sayılır. Hazırlığa başladığın günü verirsen
                ilerleme çubuğu anlamlı olur.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-note">Not</Label>
            <Textarea
              id="goal-note"
              rows={2}
              value={form.note}
              placeholder="İsteğe bağlı"
              onChange={(event) => patch({ note: event.target.value })}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {goal ? (
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  deleteGoal(goal.id);
                  onClose();
                }}
              >
                <Trash2 className="size-4" />
                Sil
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" disabled={!gecerli}>
                {submitLabel}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
