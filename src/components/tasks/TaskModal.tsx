'use client';

import { useState } from 'react';
import { Lock, Trash2 } from 'lucide-react';

import { CategoryPicker } from '@/components/tasks/CategoryPicker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { DAY_END_MINUTE, MIN_TASK_MINUTES } from '@/lib/constants';
import {
  formatDuration,
  fromDayMinutes,
  getDurationMinutes,
  getStartMinutes,
  snapMinutes,
} from '@/lib/time';
import { useTaskStore } from '@/store/useTaskStore';
import type { TaskCategory } from '@/types';

/** "HH:mm" ↔ gün içi dakika. Time input'un dili budur. */
function toTimeValue(minutes: number): string {
  const clamped = Math.min(DAY_END_MINUTE - 1, Math.max(0, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

function fromTimeValue(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

type FormState = {
  title: string;
  description: string;
  category: TaskCategory;
  start: number;
  end: number;
  isFixed: boolean;
  isCompleted: boolean;
};

/**
 * Pencerenin dış kabuğu: store'dan hangi modda açıldığını okur ve formun
 * BAŞLANGIÇ değerlerini hazırlar.
 *
 * Form state'i `key` ile yeniden kurulan alt bileşende yaşıyor — böylece
 * "prop değişti, state'i güncelle" efektine hiç gerek kalmıyor. Taslak
 * yalnızca formda durur; Kaydet'e basılmadan store'a hiçbir şey yazılmaz,
 * bu yüzden İptal her zaman temiz bir çıkıştır.
 */
export function TaskModal() {
  const editor = useTaskStore((s) => s.editor);
  const tasks = useTaskStore((s) => s.tasks);

  if (!editor) return null;

  if (editor.mode === 'create') {
    return (
      <TaskEditorDialog
        key={`create-${editor.start}-${editor.duration}`}
        heading="Yeni blok"
        submitLabel="Ekle"
        taskId={null}
        initial={{
          title: '',
          description: '',
          category: 'WORK',
          start: editor.start,
          end: Math.min(DAY_END_MINUTE, editor.start + editor.duration),
          isFixed: false,
          isCompleted: false,
        }}
      />
    );
  }

  // Savunma amaçlı: görev silinince store zaten editor'ü kapatıyor.
  const task = tasks.find((t) => t.id === editor.taskId);
  if (!task) return null;

  const start = getStartMinutes(task);
  return (
    <TaskEditorDialog
      key={`edit-${task.id}`}
      heading="Bloğu düzenle"
      submitLabel="Kaydet"
      taskId={task.id}
      initial={{
        title: task.title,
        description: task.description ?? '',
        category: task.category,
        start,
        end: start + getDurationMinutes(task),
        isFixed: task.isFixed,
        isCompleted: task.isCompleted,
      }}
    />
  );
}

type DialogProps = {
  heading: string;
  submitLabel: string;
  /** null ise yeni blok oluşturulur. */
  taskId: string | null;
  initial: FormState;
};

function TaskEditorDialog({ heading, submitLabel, taskId, initial }: DialogProps) {
  const day = useTaskStore((s) => s.selectedDate);
  const closeEditor = useTaskStore((s) => s.closeEditor);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const [form, setForm] = useState<FormState>(initial);
  const isEdit = taskId !== null;
  const duration = Math.max(MIN_TASK_MINUTES, form.end - form.start);

  const patch = (changes: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...changes }));

  /** Başlangıç değişince süre korunur — takvim uygulamalarının beklenen davranışı. */
  const handleStartChange = (value: string) => {
    const minutes = fromTimeValue(value);
    if (minutes === null) return;
    const start = snapMinutes(Math.min(minutes, DAY_END_MINUTE - MIN_TASK_MINUTES));
    patch({ start, end: Math.min(DAY_END_MINUTE, start + duration) });
  };

  /** Bitiş başlangıcın gerisine düşemez; en az 15dk kalır. 00:00 = gün sonu. */
  const handleEndChange = (value: string) => {
    const minutes = fromTimeValue(value);
    if (minutes === null) return;
    const snapped = snapMinutes(minutes);
    const end = snapped === 0 ? DAY_END_MINUTE : snapped;
    patch({ end: Math.max(form.start + MIN_TASK_MINUTES, Math.min(DAY_END_MINUTE, end)) });
  };

  const handleSubmit = () => {
    const payload = {
      title: form.title.trim() || 'Adsız blok',
      description: form.description.trim() || undefined,
      startTime: fromDayMinutes(day, form.start),
      endTime: fromDayMinutes(day, form.start + duration),
      category: form.category,
      isFixed: form.isFixed,
      isCompleted: form.isCompleted,
    };

    if (taskId) updateTask(taskId, payload);
    else addTask(payload);

    closeEditor();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {toTimeValue(form.start)} – {toTimeValue(form.start + duration)} ·{' '}
            {formatDuration(duration)}
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
            <Label htmlFor="task-title">Başlık</Label>
            <Input
              id="task-title"
              autoFocus
              value={form.title}
              placeholder="Ne yapacaksın?"
              onChange={(event) => patch({ title: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <CategoryPicker value={form.category} onChange={(category) => patch({ category })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start">Başlangıç</Label>
              <Input
                id="task-start"
                type="time"
                step={900}
                className="font-mono"
                value={toTimeValue(form.start)}
                onChange={(event) => handleStartChange(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-end">Bitiş</Label>
              <Input
                id="task-end"
                type="time"
                step={900}
                className="font-mono"
                value={toTimeValue(form.start + duration)}
                onChange={(event) => handleEndChange(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-note">Not</Label>
            <Textarea
              id="task-note"
              rows={2}
              value={form.description}
              placeholder="İsteğe bağlı"
              onChange={(event) => patch({ description: event.target.value })}
            />
          </div>

          <div className="space-y-2.5 rounded-md border bg-muted/40 p-3">
            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={form.isFixed}
                onCheckedChange={(checked) => patch({ isFixed: checked === true })}
                className="mt-0.5"
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="size-3" /> Sabit saat
                </span>
                <span className="text-xs text-muted-foreground">
                  Tampon algoritması bu bloğu otomatik kaydırmaz.
                </span>
              </span>
            </label>

            {isEdit && (
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox
                  checked={form.isCompleted}
                  onCheckedChange={(checked) => patch({ isCompleted: checked === true })}
                />
                <span className="font-medium">Tamamlandı</span>
              </label>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {taskId ? (
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => deleteTask(taskId)}
              >
                <Trash2 className="size-4" />
                Sil
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeEditor}>
                İptal
              </Button>
              <Button type="submit">{submitLabel}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
