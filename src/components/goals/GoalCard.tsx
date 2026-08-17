'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatRemaining, getGoalProgress, parseDayKey, type Goal } from '@/lib/goals';
import { formatDayLabel } from '@/lib/time';
import { cn } from '@/lib/utils';

type Props = {
  goal: Goal;
  now: Date;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
};

/**
 * Tek hedef kartı.
 *
 * Kartın kahramanı KALAN GÜN sayısı — mono ve iri. Yüzde onun altında,
 * çubuk da yüzdeyi çiziyor. Sıralama zaten yaklaşanı öne aldığı için
 * ekranın üstü hep en yakın tarihi gösteriyor.
 */
export function GoalCard({ goal, now, onEdit, onDelete }: Props) {
  const ilerleme = getGoalProgress(goal, now);
  const hedefTarihi = parseDayKey(goal.targetDate);

  return (
    <li
      className={cn(
        'group rounded-xl border bg-canvas p-4 transition-colors',
        ilerleme.isPast && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-medium leading-tight">{goal.title}</h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {hedefTarihi ? formatDayLabel(hedefTarihi) : goal.targetDate}
            {hedefTarihi && (
              <span className="ml-1.5 opacity-60">{hedefTarihi.getFullYear()}</span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={() => onEdit(goal)}
            aria-label={`${goal.title} hedefini düzenle`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(goal.id)}
            aria-label={`${goal.title} hedefini sil`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="font-mono text-3xl font-semibold leading-none tracking-tight">
          {formatRemaining(ilerleme)}
        </span>
        <span className="font-mono text-sm text-muted-foreground">
          %{Math.round(ilerleme.remainingPercent)} kaldı
        </span>
      </div>

      {/* İlerleme çubuğu geçen yolu gösteriyor: dolan kısım "geride kalan". */}
      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-rule-soft"
        role="progressbar"
        aria-valuenow={Math.round(ilerleme.elapsedPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${goal.title} ilerlemesi`}
      >
        <div
          className="h-full rounded-full bg-foreground/70 transition-[width] duration-500"
          style={{ width: `${ilerleme.elapsedPercent}%` }}
        />
      </div>

      {goal.note && (
        <p className="mt-3 text-[13px] leading-snug text-muted-foreground">{goal.note}</p>
      )}
    </li>
  );
}
