'use client';

import { useState } from 'react';
import { create } from 'zustand';
import { Bell, BellOff, CalendarCheck, LayoutTemplate, Loader2, Repeat, Trash2, Wand2 } from 'lucide-react';

import { CategoryPicker } from '@/components/tasks/CategoryPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useBlockNotifications } from '@/hooks/use-block-notifications';
import { postAi } from '@/lib/ai-client';
import { localReview, summarizeDay } from '@/lib/day-review';
import {
  DAY_LABELS,
  DAY_TEMPLATES,
  EVERY_DAY,
  WEEKDAYS,
  WEEKEND,
} from '@/lib/routines';
import { formatDuration } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';
import { CATEGORY_META, type TaskCategory } from '@/types';

function toMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

type ToolsStore = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useDayToolsStore = create<ToolsStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

/** Şablonlar, rutinler, bildirimler ve gün değerlendirmesi tek çekmecede. */
export function DayToolsSheet({ showTrigger = true }: { showTrigger?: boolean }) {
  const open = useDayToolsStore((s) => s.open);
  const setOpen = useDayToolsStore((s) => s.setOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <SheetTrigger
          render={
            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3 text-xs">
              <Wand2 className="size-3.5" />
              Araçlar
            </Button>
          }
        />
      )}
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Gün araçları</SheetTitle>
        </SheetHeader>
        <div className="space-y-8 px-4 pb-8">
          <ReviewSection />
          <TemplatesSection />
          <RoutinesSection />
          <NotificationsSection />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Bell; children: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </h3>
  );
}

/* -------------------------------- Değerlendirme --------------------------- */

function ReviewSection() {
  const tasks = useTaskStore((s) => s.tasks);
  const day = useTaskStore((s) => s.selectedDate);
  const [review, setReview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const summary = summarizeDay(tasks, day);
      const ai = await postAi<{ review: string }>('/api/review', { summary });
      setReview(ai?.review ?? localReview(summary));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <SectionTitle icon={CalendarCheck}>Günü değerlendir</SectionTitle>
      <Button size="sm" variant="outline" onClick={() => void run()} disabled={busy} className="gap-1.5">
        {busy && <Loader2 className="size-3.5 animate-spin" />}
        Seçili günü yorumla
      </Button>
      {review && <p className="mt-3 rounded-md border bg-muted/40 p-3 text-sm leading-relaxed">{review}</p>}
    </section>
  );
}

/* -------------------------------- Şablonlar ------------------------------- */

function TemplatesSection() {
  const applyTemplate = useTaskStore((s) => s.applyTemplate);

  return (
    <section>
      <SectionTitle icon={LayoutTemplate}>Gün şablonları</SectionTitle>
      <ul className="space-y-2">
        {DAY_TEMPLATES.map((template) => (
          <li key={template.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{template.name}</p>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => applyTemplate(template.id)}>
              Uygula
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Mevcut bloklarla çakışan maddeler atlanır; hiçbir şeyin üstüne yazılmaz.
      </p>
    </section>
  );
}

/* --------------------------------- Rutinler ------------------------------- */

function RoutinesSection() {
  const routines = useTaskStore((s) => s.routines);
  const addRoutine = useTaskStore((s) => s.addRoutine);
  const deleteRoutine = useTaskStore((s) => s.deleteRoutine);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('ROUTINE');
  const [start, setStart] = useState(8 * 60 + 30);
  const [duration, setDuration] = useState(60);
  const [days, setDays] = useState<number[]>(WEEKDAYS);

  const toggleDay = (day: number) =>
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));

  const submit = () => {
    if (!title.trim() || days.length === 0) return;
    addRoutine({
      title: title.trim().slice(0, 80),
      category,
      start,
      duration,
      days,
      isFixed: false,
    });
    setTitle('');
  };

  return (
    <section>
      <SectionTitle icon={Repeat}>Rutinler</SectionTitle>

      {routines.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {routines.map((routine) => (
            <li key={routine.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {CATEGORY_META[routine.category].emoji} {routine.title}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {toTime(routine.start)} · {formatDuration(routine.duration)} ·{' '}
                  {DAY_LABELS.filter((d) => routine.days.includes(d.day)).map((d) => d.label).join(' ')}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteRoutine(routine.id)}
                aria-label={`${routine.title} rutinini sil`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="space-y-3 rounded-md border bg-muted/30 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="routine-title">Yeni rutin</Label>
          <Input
            id="routine-title"
            value={title}
            placeholder="Örn. Spor, Kahvaltı"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <CategoryPicker value={category} onChange={setCategory} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="routine-start">Başlangıç</Label>
            <Input
              id="routine-start"
              type="time"
              step={900}
              className="font-mono"
              value={toTime(start)}
              onChange={(event) => {
                const m = toMinutes(event.target.value);
                if (m !== null) setStart(Math.round(m / 15) * 15);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="routine-duration">Süre (dk)</Label>
            <Input
              id="routine-duration"
              type="number"
              min={15}
              max={720}
              step={15}
              className="font-mono"
              value={duration}
              onChange={(event) => {
                const v = Number(event.target.value);
                if (Number.isFinite(v)) setDuration(Math.min(720, Math.max(15, Math.round(v / 15) * 15)));
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Günler</Label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map(({ day, label }) => (
              <button
                key={day}
                type="button"
                aria-pressed={days.includes(day)}
                onClick={() => toggleDay(day)}
                className={cn(
                  'rounded-md border px-2 py-1 text-xs transition-colors',
                  days.includes(day) ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <button type="button" className="underline" onClick={() => setDays(WEEKDAYS)}>Hafta içi</button>
            <button type="button" className="underline" onClick={() => setDays(WEEKEND)}>Hafta sonu</button>
            <button type="button" className="underline" onClick={() => setDays(EVERY_DAY)}>Her gün</button>
          </div>
        </div>

        <Button type="submit" size="sm" disabled={!title.trim() || days.length === 0}>
          Rutin ekle
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Rutinler bu cihazda saklanır. İlgili günü açtığında boş yerlere otomatik yerleşir.
        </p>
      </form>
    </section>
  );
}

/* -------------------------------- Bildirimler ----------------------------- */

function NotificationsSection() {
  const { state, toggle } = useBlockNotifications();

  const label: Record<typeof state, string> = {
    unsupported: 'Bu tarayıcı bildirimleri desteklemiyor.',
    denied: 'Bildirim izni engellenmiş. Tarayıcı site ayarlarından açabilirsin.',
    off: 'Bir blok başlamadan 5 dakika önce haber ver.',
    on: 'Açık: bloklar başlamadan 5 dakika önce haber verilecek (uygulama açıkken).',
  };

  return (
    <section>
      <SectionTitle icon={state === 'on' ? Bell : BellOff}>Bildirimler</SectionTitle>
      <p className="mb-3 text-sm text-muted-foreground">{label[state]}</p>
      <Button
        size="sm"
        variant="outline"
        disabled={state === 'unsupported' || state === 'denied'}
        onClick={() => void toggle()}
      >
        {state === 'on' ? 'Kapat' : 'Aç'}
      </Button>
    </section>
  );
}
