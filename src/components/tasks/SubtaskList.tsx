'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';

const NO_SUBTASKS: never[] = [];

/**
 * Bloğun alt görevleri. Kendi `<form>`'u yok: TaskModal'ın formunun içinde
 * durduğu için Enter'ı yakalayıp ana formu göndermeyi engelliyoruz.
 */
export function SubtaskList({ taskId }: { taskId: string }) {
  const subtasks = useTaskStore((s) => s.subtasks[taskId]) ?? NO_SUBTASKS;
  const addSubtask = useTaskStore((s) => s.addSubtask);
  const toggleSubtask = useTaskStore((s) => s.toggleSubtask);
  const deleteSubtask = useTaskStore((s) => s.deleteSubtask);
  const [draft, setDraft] = useState('');

  const commit = () => {
    addSubtask(taskId, draft);
    setDraft('');
  };

  const done = subtasks.filter((s) => s.done).length;

  return (
    <div className="space-y-2">
      <Label htmlFor="subtask-draft">
        Alt görevler
        {subtasks.length > 0 && (
          <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
            {done}/{subtasks.length}
          </span>
        )}
      </Label>

      {subtasks.length > 0 && (
        <ul className="space-y-1">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="group flex items-center gap-2 text-sm">
              <Checkbox
                checked={subtask.done}
                onCheckedChange={() => toggleSubtask(taskId, subtask.id)}
                aria-label={subtask.title}
              />
              <span className={cn('min-w-0 flex-1 truncate', subtask.done && 'text-muted-foreground line-through')}>
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => deleteSubtask(taskId, subtask.id)}
                aria-label={`${subtask.title} alt görevini sil`}
                className="text-muted-foreground opacity-60 hover:text-destructive hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          id="subtask-draft"
          value={draft}
          placeholder="Alt görev ekle"
          className="h-8"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
        />
        <button
          type="button"
          onClick={commit}
          disabled={!draft.trim()}
          aria-label="Alt görevi ekle"
          className="flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
