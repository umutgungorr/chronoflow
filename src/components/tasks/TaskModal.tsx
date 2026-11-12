'use client';

import { useState } from 'react';
import { Lock, Trash2 } from 'lucide-react';

import { CategoryPicker } from '@/components/tasks/CategoryPicker';
import { SubtaskList } from '@/components/tasks/SubtaskList';
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
import { TimeSelect } from '@/components/ui/time-select';
import { DAY_END_MINUTE } from '@/lib/constants';
import {
  formatDuration,
  fromDayMinutes,
  getDurationMinutes,
  getStartMinutes,
} from '@/lib/time';
import { useTaskStore } from '@/store/useTaskStore';
import type { TaskCategory } from '@/types';

/** "HH:mm" biçimi (gün sonu 1440 → "24:00"). */
function toTimeValue(minutes: number): string {
  if (minutes >= DAY_END_MINUTE) return '24:00';
  const clamped = Math.max(0, minutes);
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
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
  const rawDuration = form.end - form.start;
  const isRangeValid = rawDuration >= 1;
  const duration = Math.max(1, rawDuration);

  const patch = (changes: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...changes }));

  /**
   * Başlangıç seçildiğinde bitiş hâlâ başlangıçtan sonraysa bitişe dokunma
   * (kullanıcı bitişi bağımsız seçebilsin); başlangıç bitişi geçerse önceki
   * süreyi koruyarak bitişi ileri al.
   */
  const handleStartMinutes = (minutes: number) => {
    const start = Math.max(0, Math.min(minutes, DAY_END_MINUTE - 1));
    if (start < form.end) {
      patch({ start });
      return;
    }
    const carry = form.end > form.start ? form.end - form.start : 60;
    patch({ start, end: Math.min(DAY_END_MINUTE, start + carry) });
  };

  /** Bitiş saati tamamen bağımsız ayarlanır (en erken 00:01, en geç 24:00). */
  const handleEndMinutes = (minutes: number) => {
    const end = Math.max(1, Math.min(DAY_END_MINUTE, minutes));
    patch({ end });
  };

  const handleSubmit = () => {
    if (!isRangeValid) return;

    const payload = {
      title: form.title.trim() || 'Adsız blok',
      description: form.description.trim() || undefined,
      startTime: fromDayMinutes(day, form.start),
      endTime: fromDayMinutes(day, form.end),
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {toTimeValue(form.start)} – {toTimeValue(form.end)}
            {isRangeValid ? ` · ${formatDuration(duration)}` : ' · geçersiz aralık'}
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
              autoFocus={!isEdit}
              value={form.title}
              placeholder="Ne yapacaksın?"
              onChange={(event) => patch({ title: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <CategoryPicker value={form.category} onChange={(category) => patch({ category })} />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-start">Başlangıç</Label>
                <TimeSelect
                  id="task-start"
                  label="Başlangıç"
                  value={form.start}
                  onChange={handleStartMinutes}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-end">Bitiş</Label>
                <TimeSelect
                  id="task-end"
                  label="Bitiş"
                  value={form.end}
                  allowEndOfDay
                  onChange={handleEndMinutes}
                />
              </div>
            </div>
            {!isRangeValid && (
              <p className="text-xs font-medium text-destructive">
                Bitiş saati başlangıç saatinden sonra olmalı.
              </p>
            )}
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

          {taskId && <SubtaskList taskId={taskId} />}

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
              <Button type="submit" disabled={!isRangeValid}>
                {submitLabel}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
