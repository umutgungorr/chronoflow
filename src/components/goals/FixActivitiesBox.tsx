'use client';

import { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Clock,
  Coffee,
  Dumbbell,
  Laptop,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';

import { DAY_LABELS, EVERY_DAY, WEEKDAYS, WEEKEND, type Routine } from '@/lib/routines';
import { dayKey, formatDuration, formatTime, fromDayMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';
import { CATEGORY_META, type TaskCategory } from '@/types';

const CATEGORIES: { id: TaskCategory; label: string; icon: typeof Laptop }[] = [
  { id: 'WORK', label: 'Çalışma', icon: Laptop },
  { id: 'HEALTH', label: 'Sağlık', icon: Dumbbell },
  { id: 'ROUTINE', label: 'Rutin', icon: Coffee },
  { id: 'SOCIAL', label: 'Sosyal', icon: Users },
  { id: 'URGENT', label: 'Acil', icon: Zap },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export function FixActivitiesBox() {
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const routines = useTaskStore((s) => s.routines ?? []);
  const routineCompleted = useTaskStore((s) => s.routineCompleted ?? {});
  const addRoutine = useTaskStore((s) => s.addRoutine);
  const updateRoutine = useTaskStore((s) => s.updateRoutine);
  const deleteRoutine = useTaskStore((s) => s.deleteRoutine);
  const toggleRoutineCompleted = useTaskStore((s) => s.toggleRoutineCompleted);
  const addRoutineToTimeline = useTaskStore((s) => s.addRoutineToTimeline);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [timeStr, setTimeStr] = useState('08:30');
  const [duration, setDuration] = useState(45);
  const [category, setCategory] = useState<TaskCategory>('ROUTINE');
  const [days, setDays] = useState<number[]>(EVERY_DAY);
  const [isFixed, setIsFixed] = useState(true);

  const currentKey = dayKey(selectedDate);
  const completedTodayList = routineCompleted[currentKey] ?? [];

  // Bugün geçerli olan rutinler
  const currentWeekday = selectedDate.getDay();
  const routinesForToday = useMemo(
    () => routines.filter((r) => r.days.includes(currentWeekday)),
    [routines, currentWeekday],
  );

  const completedCount = routinesForToday.filter((r) =>
    completedTodayList.includes(r.id),
  ).length;
  const totalCount = routinesForToday.length;

  const openCreateModal = () => {
    setEditingRoutine(null);
    setTitle('');
    setTimeStr('08:30');
    setDuration(45);
    setCategory('ROUTINE');
    setDays(EVERY_DAY);
    setIsFixed(true);
    setIsModalOpen(true);
  };

  const openEditModal = (routine: Routine) => {
    setEditingRoutine(routine);
    setTitle(routine.title);
    const h = Math.floor(routine.start / 60);
    const m = routine.start % 60;
    setTimeStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    setDuration(routine.duration);
    setCategory(routine.category);
    setDays(routine.days);
    setIsFixed(routine.isFixed);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const [h, m] = timeStr.split(':').map(Number);
    const startMinutes = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);

    if (editingRoutine) {
      updateRoutine(editingRoutine.id, {
        title: cleanTitle,
        start: startMinutes,
        duration,
        category,
        days: days.length > 0 ? days : EVERY_DAY,
        isFixed,
      });
    } else {
      addRoutine({
        title: cleanTitle,
        start: startMinutes,
        duration,
        category,
        days: days.length > 0 ? days : EVERY_DAY,
        isFixed,
      });
    }

    setIsModalOpen(false);
  };

  const toggleDay = (dayNum: number) => {
    if (days.includes(dayNum)) {
      if (days.length > 1) {
        setDays(days.filter((d) => d !== dayNum));
      }
    } else {
      setDays([...days, dayNum].sort());
    }
  };

  const formatDaysLabel = (routineDays: number[]) => {
    if (routineDays.length === 7) return 'Her gün';
    if (
      routineDays.length === 5 &&
      routineDays.every((d) => WEEKDAYS.includes(d))
    )
      return 'Hafta içi';
    if (
      routineDays.length === 2 &&
      routineDays.every((d) => WEEKEND.includes(d))
    )
      return 'Hafta sonu';
    return routineDays
      .map((d) => DAY_LABELS.find((l) => l.day === d)?.label)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur">
      {/* Üst Kısım: Notion Başlığı & Aksiyon */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="size-4 fill-primary/20" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Fix Aktiviteler</h2>
            <p className="text-xs text-muted-foreground">
              Sabit rutinler & alışkanlıklar ({routines.length} kayıtlı)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary/25 shadow-[0_0_12px_-3px_var(--primary)]"
        >
          <Plus className="size-3.5" />
          Yeni Fix Aktivite
        </button>
      </div>

      {/* Bugünün Durumu Özeti */}
      {totalCount > 0 && (
        <div className="mb-3.5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#070c10] px-3 py-2 text-xs">
          <span className="text-muted-foreground">Bugün planlanan sabit rutinler:</span>
          <span className="font-mono font-medium text-foreground">
            {completedCount}/{totalCount} tamamlandı
          </span>
        </div>
      )}

      {/* Fix Aktiviteler Listesi */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {routines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Henüz fix aktivite ayarlamadın.</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60 max-w-[280px]">
              Her gün yaptığın spor, kitap okuma veya derin çalışma gibi sabit alışkanlıklarını buraya ekleyebilirsin.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              + İlk fix aktiviteni oluştur
            </button>
          </div>
        ) : (
          routines.map((routine) => {
            const meta = CATEGORY_META[routine.category] ?? CATEGORY_META.ROUTINE;
            const isCompletedToday = completedTodayList.includes(routine.id);
            const isTodayScheduled = routine.days.includes(currentWeekday);

            const startText = formatTime(fromDayMinutes(selectedDate, routine.start));
            const endText = formatTime(
              fromDayMinutes(selectedDate, routine.start + routine.duration),
            );

            return (
              <div
                key={routine.id}
                className={cn(
                  'group flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-[#0e1620]/80 p-3 transition-all hover:border-white/[0.12] hover:bg-[#121c28]',
                  isCompletedToday && 'border-primary/30 bg-primary/[0.04]',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Habit Tamamlama Checkbox (Bugün yapıldı mı?) */}
                    <button
                      type="button"
                      onClick={() => toggleRoutineCompleted(routine.id, currentKey)}
                      aria-label="Bugün yapıldı olarak işaretle"
                      title={
                        isCompletedToday
                          ? 'Bugün yapıldı (kaldırmak için tıkla)'
                          : 'Bugün yapıldı olarak işaretle'
                      }
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-all',
                        isCompletedToday
                          ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_8px_var(--primary)]'
                          : 'border-white/30 bg-transparent hover:border-primary/70',
                      )}
                    >
                      {isCompletedToday && <Check className="size-3.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'truncate font-semibold text-sm text-foreground',
                            isCompletedToday && 'line-through opacity-75',
                          )}
                        >
                          {routine.title}
                        </span>
                        {routine.isFixed && (
                          <span className="rounded bg-white/[0.05] px-1 py-0.2 font-mono text-[9px] text-muted-foreground">
                            Sabit
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 text-foreground/85">
                          <Clock className="size-3 text-primary/70" />
                          {startText} – {endText}
                        </span>
                        <span>·</span>
                        <span>{formatDuration(routine.duration)}</span>
                        <span>·</span>
                        <span className="text-primary/90 font-sans font-medium">
                          {formatDaysLabel(routine.days)}
                        </span>
                        <span className="hidden items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                          <span className={cn('size-1.5 rounded-full', meta.bg)} />
                          {meta.label}
                        </span>
                        {!isTodayScheduled && (
                          <span className="text-[10px] italic text-muted-foreground/60">
                            (Bugün planlı değil)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sağ Aksiyon Butonları */}
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Zaman Tüneline Blok Olarak Ekle */}
                    <button
                      type="button"
                      onClick={() => addRoutineToTimeline(routine.id, selectedDate)}
                      title="Bu aktiviteyi bugünün saatine takvim bloğu olarak işle"
                      className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      <CalendarPlus className="size-3.5 text-primary" />
                      <span className="hidden sm:inline">Güne Ekle</span>
                    </button>

                    {/* Düzenle */}
                    <button
                      type="button"
                      onClick={() => openEditModal(routine)}
                      title="Aktiviteyi düzenle"
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>

                    {/* Sil */}
                    <button
                      type="button"
                      onClick={() => deleteRoutine(routine.id)}
                      title="Aktiviteyi sil"
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notion Tarzı Fix Aktivite Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200">
          <div className="flex w-full max-w-md flex-col rounded-2xl border border-white/[0.1] bg-[#0c1218] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <h3 className="text-base font-semibold text-foreground">
                {editingRoutine ? 'Fix Aktiviteyi Düzenle' : 'Yeni Fix Aktivite Ayarla'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 py-4">
              {/* Başlık */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Aktivite Adı</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="örn: Sabah Koşusu, Kitap Okuma..."
                  autoFocus
                  className="w-full rounded-xl border border-white/[0.08] bg-[#070c10] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Başlangıç Saati ve Süre */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Başlangıç Saati</label>
                  <input
                    type="time"
                    step={60}
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#070c10] px-3 py-2 font-mono text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Süre (Dakika)</label>
                  <input
                    type="number"
                    step={1}
                    min={5}
                    max={240}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(5, Number(e.target.value)))}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#070c10] px-3 py-2 font-mono text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  />
                </div>
              </div>

              {/* Hızlı Süre Butonları */}
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors',
                      duration === d
                        ? 'border-primary bg-primary/20 font-bold text-primary'
                        : 'border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
                    )}
                  >
                    {d}dk
                  </button>
                ))}
              </div>

              {/* Tekrar Günleri */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Tekrar Günleri</label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDays(EVERY_DAY)}
                      className="text-primary hover:underline"
                    >
                      Her gün
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setDays(WEEKDAYS)}
                      className="text-primary hover:underline"
                    >
                      Hafta içi
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {DAY_LABELS.map(({ day, label }) => {
                    const active = days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={cn(
                          'flex h-8 items-center justify-center rounded-lg border text-xs font-medium transition-all',
                          active
                            ? 'border-primary bg-primary text-primary-foreground font-bold shadow-[0_0_8px_var(--primary)]'
                            : 'border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05]',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kategori Seçimi */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Kategori</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-xs transition-all',
                          active
                            ? 'border-primary bg-primary/15 font-semibold text-primary shadow-[0_0_8px_rgba(46,230,184,0.25)]'
                            : 'border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
                        )}
                      >
                        <Icon className="size-4" />
                        <span className="text-[10px]">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Alt Butonlar */}
            <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!title.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_12px_var(--primary)] transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {editingRoutine ? 'Kaydet' : 'Aktiviteyi Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
