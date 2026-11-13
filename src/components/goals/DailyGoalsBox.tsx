'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  Coffee,
  Dumbbell,
  Laptop,
  Plus,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';

import { getTaskIconMeta } from '@/lib/task-icons';
import { dayKey, formatDayLabel } from '@/lib/time';
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

export function DailyGoalsBox() {
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const dailyGoals = useTaskStore((s) => s.dailyGoals ?? []);
  const addDailyGoal = useTaskStore((s) => s.addDailyGoal);
  const toggleDailyGoal = useTaskStore((s) => s.toggleDailyGoal);
  const updateDailyGoal = useTaskStore((s) => s.updateDailyGoal);
  const deleteDailyGoal = useTaskStore((s) => s.deleteDailyGoal);
  const addDailyGoalToTimeline = useTaskStore((s) => s.addDailyGoalToTimeline);

  const [newTitle, setNewTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('WORK');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const currentKey = dayKey(selectedDate);

  // Bu güne ait hedefler
  const currentGoals = useMemo(
    () => dailyGoals.filter((g) => !g.date || g.date === currentKey),
    [dailyGoals, currentKey],
  );

  const completedCount = currentGoals.filter((g) => g.isCompleted).length;
  const totalCount = currentGoals.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredGoals = useMemo(() => {
    if (filter === 'active') return currentGoals.filter((g) => !g.isCompleted);
    if (filter === 'completed') return currentGoals.filter((g) => g.isCompleted);
    return currentGoals;
  }, [currentGoals, filter]);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addDailyGoal({
      title: newTitle.trim(),
      category: selectedCategory,
      date: currentKey,
    });
    setNewTitle('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditTitle(current);
  };

  const saveEdit = (id: string) => {
    if (editTitle.trim()) {
      updateDailyGoal(id, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0b1117]/90 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur">
      {/* Üst Kısım: Notion Başlığı & İlerleme */}
      <div className="flex flex-col gap-3 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Check className="size-4 stroke-[2.5]" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">Günlük Hedefler</h2>
              <p className="text-xs text-muted-foreground">{formatDayLabel(selectedDate)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-foreground">
              {completedCount}/{totalCount}
            </span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
              %{progressPercent}
            </span>
          </div>
        </div>

        {/* Notion Minimal İlerleme Çubuğu */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out shadow-[0_0_8px_var(--primary)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Filtre sekmeleri */}
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'rounded-md px-2 py-0.5 transition-colors',
                filter === 'all'
                  ? 'bg-white/10 font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Tümü ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={cn(
                'rounded-md px-2 py-0.5 transition-colors',
                filter === 'active'
                  ? 'bg-white/10 font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Yapılacak ({totalCount - completedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={cn(
                'rounded-md px-2 py-0.5 transition-colors',
                filter === 'completed'
                  ? 'bg-white/10 font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Bitenler ({completedCount})
            </button>
          </div>
        )}
      </div>

      {/* Notion Tarzı Hızlı Satır İçi Hedef Ekleme (Inline Input) */}
      <div className="group relative mb-3 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#070c10] px-3 py-2 transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/40">
        <button
          type="button"
          onClick={handleAdd}
          className="flex size-5 shrink-0 items-center justify-center rounded-md border border-white/20 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          title="Hedef ekle"
        >
          <Plus className="size-3.5" />
        </button>

        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="+ Yeni hedef yaz ve Enter'a bas..."
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />

        {/* Kategori Seçici Hap */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
          >
            <span
              className={cn(
                'size-2 rounded-full',
                CATEGORY_META[selectedCategory]?.bg ?? 'bg-primary',
              )}
            />
            {CATEGORY_META[selectedCategory]?.label ?? 'Kategori'}
            <ChevronDown className="size-3 opacity-60" />
          </button>

          {showCategoryPicker && (
            <div className="absolute right-0 top-full z-20 mt-1 flex w-36 flex-col gap-0.5 rounded-xl border border-white/[0.1] bg-[#101820] p-1.5 shadow-xl backdrop-blur">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setShowCategoryPicker(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                      selectedCategory === cat.id
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hedef Listesi (Notion Todo List) */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              {totalCount === 0
                ? 'Henüz günlük hedef girmedin.'
                : 'Bu filtreye uygun hedef bulunamadı.'}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Yukarıdaki alana yazıp Enter&apos;a basarak hemen ekleyebilirsin.
            </p>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const meta = CATEGORY_META[goal.category] ?? CATEGORY_META.WORK;
            const iconMeta = getTaskIconMeta(goal.title, goal.category);
            const GoalIcon = iconMeta.icon;
            const isEditing = editingId === goal.id;

            return (
              <div
                key={goal.id}
                className={cn(
                  'group flex items-center justify-between gap-2.5 rounded-xl border border-transparent px-2.5 py-2 transition-all hover:border-white/[0.07] hover:bg-white/[0.03]',
                  goal.isCompleted && 'opacity-65',
                )}
              >
                {/* Sol: Notion Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleDailyGoal(goal.id)}
                  aria-label={goal.isCompleted ? 'Tamamlanmadı yap' : 'Tamamlandı işaretle'}
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-md border transition-all',
                    goal.isCompleted
                      ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_8px_var(--primary)]'
                      : 'border-white/30 bg-transparent hover:border-primary/70',
                  )}
                >
                  {goal.isCompleted && <Check className="size-3.5 stroke-[3]" />}
                </button>

                {/* Notion Ders / Aktivite İmgesi */}
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md',
                    iconMeta.badgeClass,
                  )}
                  aria-hidden
                >
                  <GoalIcon className="size-3.5 stroke-[2]" />
                </span>

                {/* Başlık (Düzenleme veya Gösterim) */}
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveEdit(goal.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(goal.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="w-full rounded border border-primary/50 bg-[#070c10] px-1.5 py-0.5 text-sm text-foreground focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(goal.id, goal.title)}
                      className={cn(
                        'cursor-pointer select-none text-sm transition-all',
                        goal.isCompleted
                          ? 'text-muted-foreground line-through decoration-primary/50'
                          : 'text-foreground hover:text-primary',
                      )}
                    >
                      {goal.title}
                    </span>
                  )}
                </div>

                {/* Kategori Rozeti */}
                <span
                  className={cn(
                    'hidden shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium sm:flex',
                    meta.surface,
                    meta.border,
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', meta.bg)} />
                  {meta.label}
                </span>

                {/* Aksiyon Butonları (Hover'da belirir) */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {/* Takvime Saat Bloğu Olarak Ekle */}
                  <button
                    type="button"
                    onClick={() => addDailyGoalToTimeline(goal.id)}
                    title="Bugünün zaman tüneline blok olarak ekle"
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary"
                  >
                    <CalendarPlus className="size-3.5" />
                  </button>

                  {/* Sil */}
                  <button
                    type="button"
                    onClick={() => deleteDailyGoal(goal.id)}
                    title="Hedefi sil"
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
