'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Flame,
  Play,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react';

import { AuthGate } from '@/components/auth/AuthGate';
import { AppShell } from '@/components/layout/AppShell';
import { FlowToast } from '@/components/layout/FlowToast';
import { SyncBridge } from '@/components/layout/SyncStatus';
import { CategoryPicker } from '@/components/tasks/CategoryPicker';
import { IconPicker } from '@/components/tasks/IconPicker';
import { SubtaskList } from '@/components/tasks/SubtaskList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDayRollover } from '@/hooks/use-day-rollover';
import { useHydratedStore } from '@/hooks/use-hydrated-store';
import {
  DEFAULT_FOCUS_SUBJECTS,
  findActiveTask,
  formatClock,
  pomodoroAt,
  secondsRemaining,
} from '@/lib/focus';
import { getTaskIconMeta } from '@/lib/task-icons';
import { dayKey, formatDuration, formatRange, formatTime, getDurationMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';
import { CATEGORY_META, type Task, type TaskCategory } from '@/types';

export default function FocusPage() {
  return (
    <AuthGate>
      <AppShell>
        <Focus />
      </AppShell>
    </AuthGate>
  );
}

function Focus() {
  const hydrated = useHydratedStore();
  useDayRollover();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 pb-10 pt-5 sm:px-6">
      {hydrated ? (
        <>
          <SyncBridge />
          <header className="space-y-1.5 pb-6">
            <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold leading-none tracking-[-0.03em]">
              Odak
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Dersini seç ve başlat — başlattığın dakikadan bitirdiğin dakikaya kadar ChronoFlow çizelgende tikli blok oluşsun.
            </p>
          </header>
          <FocusBody />
          <FlowToast />
        </>
      ) : null}
    </main>
  );
}

function FocusBody() {
  const tasks = useTaskStore((s) => s.tasks);
  const taskIcons = useTaskStore((s) => s.taskIcons ?? {});
  const dailyGoals = useTaskStore((s) => s.dailyGoals ?? []);
  const focusSubjects = useTaskStore((s) => s.focusSubjects ?? DEFAULT_FOCUS_SUBJECTS);
  const activeFocusSession = useTaskStore((s) => s.activeFocusSession);
  const startFocusSession = useTaskStore((s) => s.startFocusSession);
  const stopFocusSession = useTaskStore((s) => s.stopFocusSession);
  const cancelFocusSession = useTaskStore((s) => s.cancelFocusSession);
  const syncActiveFocusSession = useTaskStore((s) => s.syncActiveFocusSession);
  const addFocusSubject = useTaskStore((s) => s.addFocusSubject);
  const removeFocusSubject = useTaskStore((s) => s.removeFocusSubject);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);

  const [now, setNow] = useState(() => new Date());
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('WORK');
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(undefined);
  const [selectedDailyGoalId, setSelectedDailyGoalId] = useState<string | undefined>(undefined);
  const [newSubject, setNewSubject] = useState('');
  const [lastCompleted, setLastCompleted] = useState<Task | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = dayKey(now);
  const todayPendingGoals = useMemo(
    () => dailyGoals.filter((g) => (!g.date || g.date === todayKey) && !g.isCompleted),
    [dailyGoals, todayKey],
  );

  const scheduledActive = useMemo(() => findActiveTask(tasks, now), [tasks, now]);
  const nowText = formatTime(now);

  /* ------------------------------------------------------------------------ */
  /*  DURUM 1: Canlı Odak Oturumu Aktif                                       */
  /* ------------------------------------------------------------------------ */
  if (activeFocusSession) {
    const startedDate = new Date(activeFocusSession.startedAt);
    const startText = formatTime(startedDate);
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startedDate.getTime()) / 1000));
    const pomodoro = pomodoroAt(elapsedSeconds);
    const meta = CATEGORY_META[activeFocusSession.category] ?? CATEGORY_META.WORK;
    const activeIconMeta = getTaskIconMeta(
      activeFocusSession.title,
      activeFocusSession.category,
      taskIcons[activeFocusSession.taskId],
    );
    const ActiveFocusIcon = activeIconMeta.icon;

    const handleFinishAndTick = () => {
      syncActiveFocusSession(now);
      const finalized = stopFocusSession(now);
      if (finalized) {
        setLastCompleted(finalized);
        setSelectedTitle('');
        setSelectedIcon(undefined);
        setSelectedDailyGoalId(undefined);
      }
    };

    const handleCancel = () => {
      cancelFocusSession();
    };

    return (
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-primary/40 bg-canvas p-6 text-center shadow-[0_0_40px_-14px_var(--primary)]">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            CANLI ODAK SÜRÜYOR · Başlangıç: {startText} · Şu an: {nowText}
          </div>

          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {meta.emoji} {meta.label}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2.5">
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                activeIconMeta.badgeClass,
              )}
              aria-hidden
            >
              <ActiveFocusIcon className="size-4 stroke-[2]" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {activeFocusSession.title}
            </h2>
          </div>

          <p
            className="mt-5 font-mono text-6xl font-semibold tabular-nums tracking-tight text-foreground"
            aria-live="off"
          >
            {formatClock(elapsedSeconds)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {startText}&apos;den beri geçen odak süresi
          </p>

          {/* Canlı Çizelge Önizleme Kutusu */}
          <div className="mx-auto mt-5 max-w-md rounded-xl border border-white/[0.08] bg-[#091118] px-4 py-3 text-left">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" aria-hidden />
                ChronoFlow Çizelgesi
              </span>
              <span className="font-mono text-primary">
                {startText} – {nowText}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Takvimde canlı olarak uzuyor. Bitirdiğin anda bu saat aralığı tikli olarak kaydedilecek.
            </p>
          </div>

          {/* Pomodoro Evre Göstergesi */}
          <div
            className={cn(
              'mx-auto mt-5 flex w-fit items-center gap-3 rounded-full border px-4 py-2',
              pomodoro.phase === 'break' && 'border-green-500/40 bg-green-500/10',
            )}
          >
            {pomodoro.phase === 'focus' ? (
              <Flame className="size-4 text-primary" aria-hidden />
            ) : (
              <Coffee className="size-4 text-green-400" aria-hidden />
            )}
            <span className="text-sm font-medium">
              {pomodoro.phase === 'focus' ? 'Odaklan' : 'Mola'} · tur {pomodoro.cycle}
            </span>
            <span className="font-mono text-sm tabular-nums">{formatClock(pomodoro.remaining)}</span>
          </div>

          {/* Ana Aksiyonlar */}
          <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Button
              size="lg"
              onClick={handleFinishAndTick}
              className="w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-[0_0_20px_-4px_var(--primary)] hover:bg-primary/90 sm:w-auto"
            >
              <Check className="size-4 stroke-[2.5]" />
              Odağı Bitir ve Tikle ({startText} – {nowText})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              İptal et (bloğu sil)
            </Button>
          </div>
        </section>

        <section className="rounded-xl border bg-canvas p-4">
          <SubtaskList taskId={activeFocusSession.taskId} />
        </section>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /*  DURUM 2: Canlı Odak Yok — Ders Seç & Başlat                             */
  /* ------------------------------------------------------------------------ */
  const cleanTitle = selectedTitle.trim();

  const handleStartSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!cleanTitle) return;
    setLastCompleted(null);
    startFocusSession({
      title: cleanTitle,
      category: selectedCategory,
      icon: selectedIcon,
      dailyGoalId: selectedDailyGoalId,
      now: new Date(),
    });
  };

  const handleAddSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    addFocusSubject(trimmed);
    setSelectedTitle(trimmed);
    setSelectedDailyGoalId(undefined);
    setNewSubject('');
  };

  return (
    <div className="space-y-6">
      {/* Az önce tamamlanan oturum özeti */}
      {lastCompleted && (
        <section className="flex flex-col justify-between gap-3 rounded-2xl border border-primary/35 bg-primary/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {lastCompleted.title} ({formatRange(lastCompleted)}) takvime tikli olarak işlendi
              </p>
              <p className="text-xs text-muted-foreground">
                Toplam {formatDuration(getDurationMinutes(lastCompleted))} odak kaydedildi.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            render={<Link href="/" />}
          >
            Takvimde Gör
          </Button>
        </section>
      )}

      {/* Ders Seç & Canlı Odak Başlat Kartı */}
      <section className="rounded-2xl border border-white/[0.08] bg-canvas p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Flame className="size-5 text-primary" aria-hidden />
              Ders Seç &amp; Odak Başlat
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Dersi seç ve başlat — şu anki saatten (<span className="font-mono font-semibold text-foreground">{nowText}</span>) itibaren ChronoFlow çizelgesine blok açılır, bitirdiğin anda o saatte tikli olarak kapanır.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-xs text-foreground">
            <Clock className="size-3.5 text-primary" aria-hidden />
            {nowText}
          </span>
        </div>

        <form onSubmit={handleStartSubmit} className="space-y-5">
          {/* Hızlı Ders / Konu Çipleri */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Hızlı Ders / Konu Seç</span>
              <span className="text-[11px] text-muted-foreground/70">Tek tıkla seç</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {focusSubjects.map((subject) => {
                const isSelected =
                  selectedTitle.toLocaleLowerCase('tr-TR') === subject.toLocaleLowerCase('tr-TR');
                const subjectIconMeta = getTaskIconMeta(subject, 'WORK');
                const SubjectIcon = subjectIconMeta.icon;
                return (
                  <div
                    key={subject}
                    className={cn(
                      'group inline-flex items-center rounded-full border text-xs transition-all',
                      isSelected
                        ? 'border-primary bg-primary/15 font-semibold text-primary shadow-[0_0_12px_-4px_var(--primary)]'
                        : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTitle(subject);
                        setSelectedIcon(undefined);
                        setSelectedDailyGoalId(undefined);
                      }}
                      className="flex items-center gap-1.5 py-1.5 pl-2.5 pr-2 text-left"
                    >
                      <SubjectIcon className="size-3.5 shrink-0 opacity-85" aria-hidden />
                      <span>{subject}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`${subject} dersini listeden kaldır`}
                      onClick={() => removeFocusSubject(subject)}
                      className="mr-1.5 flex size-4 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Kendi dersini ekleme */}
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubject();
                  }
                }}
                placeholder="+ Yeni ders çipi ekle (örn: AYT Edebiyat)"
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSubject}
                disabled={!newSubject.trim()}
                className="h-8 shrink-0 gap-1 text-xs"
              >
                <Plus className="size-3.5" />
                Ekle
              </Button>
            </div>
          </div>

          {/* Bugünün Günlük Hedeflerinden Seç */}
          {todayPendingGoals.length > 0 && (
            <div className="space-y-2 rounded-xl border border-white/[0.06] bg-[#091017] p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Target className="size-3.5 text-primary" aria-hidden />
                <span>Bugünün Günlük Hedeflerinden Seç (bitince hedef de tiklenir)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {todayPendingGoals.map((goal) => {
                  const isGoalActive = selectedDailyGoalId === goal.id;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => {
                        setSelectedTitle(goal.title);
                        setSelectedCategory(goal.category);
                        setSelectedDailyGoalId(goal.id);
                      }}
                      className={cn(
                        'rounded-lg border px-2.5 py-1 text-xs transition-all',
                        isGoalActive
                          ? 'border-primary bg-primary/15 font-semibold text-primary'
                          : 'border-white/[0.08] bg-white/[0.03] text-foreground/85 hover:border-primary/40',
                      )}
                    >
                      {goal.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Serbest Konu Başlığı + İmge + Kategori */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="focus-title-input" className="text-xs font-medium text-muted-foreground">
                Ders / Konu Başlığı
              </label>
              <Input
                id="focus-title-input"
                value={selectedTitle}
                onChange={(e) => {
                  setSelectedTitle(e.target.value);
                  if (selectedDailyGoalId) setSelectedDailyGoalId(undefined);
                }}
                placeholder="Ne çalışacaksın? Örn: Paragraf, Basit eşitsizlikler..."
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">İmge (Notion Tarzı)</span>
              <IconPicker
                title={selectedTitle}
                category={selectedCategory}
                value={selectedIcon}
                onChange={setSelectedIcon}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Kategori</span>
              <CategoryPicker value={selectedCategory} onChange={setSelectedCategory} />
            </div>
          </div>

          {/* Başlat Butonu */}
          <Button
            type="submit"
            size="lg"
            disabled={!cleanTitle}
            className="w-full gap-2 rounded-xl bg-primary py-5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)] hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="size-4 fill-current" />
            {cleanTitle
              ? `"${cleanTitle}" İçin Odak Başlat (${nowText}'den itibaren)`
              : `Ders Seç ve Odak Başlat (${nowText}'den itibaren)`}
          </Button>
        </form>
      </section>

      {/* Takvimde o an zaten süren planlı bir blok varsa alt kısımda göster */}
      {scheduledActive && (
        <ScheduledActiveCard
          task={scheduledActive}
          now={now}
          onToggleComplete={toggleComplete}
        />
      )}
    </div>
  );
}

function ScheduledActiveCard({
  task,
  now,
  onToggleComplete,
}: {
  task: Task;
  now: Date;
  onToggleComplete: (id: string) => void;
}) {
  const meta = CATEGORY_META[task.category];
  const remaining = secondsRemaining(task, now);

  return (
    <section className="rounded-xl border border-white/[0.08] bg-canvas p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Takvimde Şu An Planlı Blok · {meta.emoji} {meta.label} · {formatRange(task)}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">{task.title}</h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold tabular-nums">{formatClock(remaining)}</p>
          <p className="text-[11px] text-muted-foreground">planlı bitişe kalan</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onToggleComplete(task.id)}>
          <Check className="size-3.5" />
          {task.isCompleted ? 'Tamamlandı işaretini kaldır' : 'Planlı bloğu tamamla'}
        </Button>
        <Button size="sm" variant="ghost" render={<Link href="/" />}>
          Plana dön
        </Button>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <SubtaskList taskId={task.id} />
      </div>
    </section>
  );
}
