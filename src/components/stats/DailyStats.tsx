'use client';

import { isToday } from 'date-fns';

import { useCurrentMinute } from '@/hooks/use-current-minute';
import { DAY_END_MINUTE } from '@/lib/constants';
import { formatDuration, getDurationMinutes, getStartMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore, useTasksForSelectedDay } from '@/store/useTaskStore';
import { CATEGORY_META, type TaskCategory } from '@/types';

const SIZE = 176;
const RADIUS = 74;
const STROKE = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Dakika → kadran üzerindeki yay uzunluğu. */
const arc = (minutes: number) => (minutes / DAY_END_MINUTE) * CIRCUMFERENCE;

/**
 * Günün dairesel analizi.
 *
 * Klasik bir donut (kategorileri yığıp toplam gösteren) yerine bloklar
 * kadranda GERÇEK SAATLERİNDE çiziliyor: 00:00 tepede, gün saat yönünde
 * ilerliyor. Böylece halka aynı anda hem bir dağılım grafiği hem de günün
 * küçültülmüş haritası oluyor — boşluklar gerçekten boş saatler.
 * Zaman tünelindeki "şimdi" çizgisinin karşılığı da kadranda ibre olarak var.
 */
type Props = {
  /**
   * Panelden bir bloğa gidildiğinde çağrılır. Telefonda kadran alttan açılan
   * bir panelde durduğu için, düzenleme penceresi açılırken o panelin
   * kapanması gerekiyor — yoksa modal panelin arkasında kalır.
   */
  onNavigate?: () => void;
};

export function DailyStats({ onNavigate }: Props = {}) {
  const tasks = useTasksForSelectedDay();
  const day = useTaskStore((s) => s.selectedDate);
  const openEditEditor = useTaskStore((s) => s.openEditEditor);
  const nowMinute = useCurrentMinute();
  const showNeedle = nowMinute !== null && isToday(day);

  const planned = tasks
    .filter((t) => t.category !== 'BUFFER')
    .reduce((sum, t) => sum + getDurationMinutes(t), 0);
  const completed = tasks.filter((t) => t.isCompleted).length;

  // Kategori kırılımı — yalnızca gerçekten kullanılanlar listelenir.
  const byCategory = tasks.reduce<Partial<Record<TaskCategory, number>>>((acc, task) => {
    acc[task.category] = (acc[task.category] ?? 0) + getDurationMinutes(task);
    return acc;
  }, {});
  const breakdown = (Object.entries(byCategory) as [TaskCategory, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-canvas p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Günün dağılımı</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {completed}/{tasks.length} bitti
        </span>
      </div>

      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          {/* -90°: yay 3 yönünde değil, saat 12'de (00:00) başlasın. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--rule-soft)"
              strokeWidth={STROKE}
            />

            {tasks.map((task) => {
              const meta = CATEGORY_META[task.category];
              const length = arc(getDurationMinutes(task));
              return (
                <circle
                  key={task.id}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={meta.hex}
                  strokeWidth={STROKE}
                  strokeOpacity={task.category === 'BUFFER' ? 0.35 : task.isCompleted ? 0.45 : 1}
                  // Yayı yerine oturtan iki değer: uzunluk ve başlangıç ofseti.
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={-arc(getStartMinutes(task))}
                />
              );
            })}

            {showNeedle && (
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--now)"
                strokeWidth={STROKE + 6}
                strokeDasharray={`2 ${CIRCUMFERENCE - 2}`}
                strokeDashoffset={-arc(nowMinute)}
              />
            )}
          </g>

          {/* 00 / 06 / 12 / 18 çentikleri — kadranı okunur kılar. */}
          {[0, 6, 12, 18].map((hour) => {
            const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2;
            const outer = RADIUS + STROKE / 2 + 6;
            const inner = RADIUS + STROKE / 2 + 2;
            return (
              <line
                key={hour}
                x1={SIZE / 2 + Math.cos(angle) * inner}
                y1={SIZE / 2 + Math.sin(angle) * inner}
                x2={SIZE / 2 + Math.cos(angle) * outer}
                y2={SIZE / 2 + Math.sin(angle) * outer}
                stroke="var(--tick)"
                strokeWidth={1}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-semibold leading-none">
            {formatDuration(planned)}
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">planlı</span>
        </div>
      </div>

      {breakdown.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          Henüz blok yok.
        </p>
      ) : (
        <ul className="space-y-1">
          {breakdown.map(([category, minutes]) => {
            const meta = CATEGORY_META[category];
            return (
              <li key={category} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    'size-2.5 shrink-0 rounded-[3px]',
                    meta.bg,
                    category === 'BUFFER' && meta.border,
                  )}
                  aria-hidden
                />
                <span className="truncate text-muted-foreground">{meta.label}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px]">
                  {formatDuration(minutes)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {tasks.length > 0 && (
        <div className="border-t pt-3">
          <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sıradaki
          </h3>
          <NextUp
            onOpen={(id) => {
              openEditEditor(id);
              onNavigate?.();
            }}
            nowMinute={showNeedle ? nowMinute : 0}
            tasks={tasks}
          />
        </div>
      )}
    </section>
  );
}

type NextUpProps = {
  tasks: ReturnType<typeof useTasksForSelectedDay>;
  nowMinute: number;
  onOpen: (id: string) => void;
};

/** Şu andan sonraki ilk iki blok — panelin "şimdi ne var?" cevabı. */
function NextUp({ tasks, nowMinute, onOpen }: NextUpProps) {
  // Tampon bloklar "sıradaki iş" değildir; listede yer kaplamasınlar.
  const upcoming = tasks
    .filter(
      (task) =>
        !task.isCompleted &&
        task.category !== 'BUFFER' &&
        getStartMinutes(task) >= nowMinute,
    )
    .slice(0, 2);

  if (upcoming.length === 0) {
    return <p className="text-xs text-muted-foreground">Bugün için başka blok yok.</p>;
  }

  return (
    <ul className="space-y-1">
      {upcoming.map((task) => {
        const meta = CATEGORY_META[task.category];
        const start = getStartMinutes(task);
        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onOpen(task.id)}
              className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  'size-2.5 shrink-0 rounded-[3px]',
                  meta.bg,
                  task.category === 'BUFFER' && meta.border,
                )}
                aria-hidden
              />
              <span className="truncate">{task.title}</span>
              <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                {String(Math.floor(start / 60)).padStart(2, '0')}:
                {String(start % 60).padStart(2, '0')}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
