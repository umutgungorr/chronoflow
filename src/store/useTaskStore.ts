'use client';

import { addDays, isToday, startOfDay } from 'date-fns';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DAY_END_MINUTE,
  MIN_TASK_MINUTES,
  STORAGE_KEY,
} from '@/lib/constants';
import { parseSchedulePrompt, planIntoDay } from '@/lib/magic-schedule';
import { createMockTasks } from '@/lib/mock-data';
import {
  findFreeSlots,
  reflow,
  sortByStart,
  withDuration,
  withStartMinutes,
  type FreeSlot,
} from '@/lib/scheduler';
import {
  clampStart,
  dayKey,
  fromDayMinutes,
  getDurationMinutes,
  getStartMinutes,
  isTaskOnDay,
  snapMinutes,
  toDayMinutes,
} from '@/lib/time';
import type { ScheduleResult, Task, TaskInput } from '@/types';

/* -------------------------------------------------------------------------- */
/*  Store tipi                                                                */
/* -------------------------------------------------------------------------- */

/** Bir aksiyon sonrası UI'a gösterilecek kısa geri bildirim. */
export type FlowFeedback = {
  message: string;
  tone: 'info' | 'warning';
} | null;

/**
 * Açık olan düzenleme penceresi.
 * `create` modunda görev henüz yoktur — saat/süre ön dolu gelir, kayıt
 * anında oluşturulur. Böylece pencere kapatılırsa ortada artık blok kalmaz.
 */
export type EditorState =
  | { mode: 'create'; start: number; duration: number }
  | { mode: 'edit'; taskId: string }
  | null;

type TaskState = {
  /** Tüm görevler (çok günlü). Gün filtrelemesi selector'larda yapılır. */
  tasks: Task[];
  /** Takvimde görüntülenen gün (her zaman günün başlangıcı). */
  selectedDate: Date;
  /** Izgarada seçili (klavyeyle taşınabilir) görev. */
  selectedTaskId: string | null;
  /** Açık düzenleme penceresi. */
  editor: EditorState;
  /** Son reflow işleminin özeti (toast göstermek için). */
  feedback: FlowFeedback;
  /**
   * Güne verilen ad. Anahtar `dayKey()` çıktısı ('YYYY-MM-DD'), yerel gün.
   * Adı olmayan günler burada hiç bulunmaz.
   */
  dayTitles: Record<string, string>;
  /**
   * Geri alma yığını. Her KULLANICI değişikliğinden önce planın o anki hali
   * buraya bırakılır. Sunucudan gelen birleştirmeler (senkron) bilerek
   * dışarıda: uzaktaki bir değişikliği "geri almak" anlamsız.
   */
  history: HistoryEntry[];
};

/** Geçmişteki bir kare: o andaki plan + ne yapıldığının adı. */
export type HistoryEntry = {
  tasks: Task[];
  dayTitles: Record<string, string>;
  label: string;
};

type TaskActions = {
  /* — Gün gezinme — */
  setSelectedDate: (date: Date) => void;
  goToPrevDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;

  /* — CRUD — */
  addTask: (input: TaskInput) => string;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  toggleFixed: (id: string) => void;

  /* — Sürükle & bırak / yeniden boyutlandırma — */
  /** Görevi yeni başlangıç dakikasına taşır (snap + clamp + reflow). */
  moveTask: (id: string, startMinutes: number) => void;
  /** Bloğun üst veya alt kenarını çeker. `minute` sürüklenen kenarın yeni konumu. */
  resizeTask: (id: string, edge: 'start' | 'end', minute: number) => void;

  /* — AI "Günüme Dağıt" — */
  applyMagicSchedule: (
    text: string,
    options?: { withBuffers?: boolean },
  ) => { placed: number; skipped: number };

  /* — UI — */
  selectTask: (id: string | null) => void;
  openCreateEditor: (start: number, duration: number) => void;
  openEditEditor: (taskId: string) => void;
  closeEditor: () => void;
  clearFeedback: () => void;

  /* — Gün adı — */
  /** Boş metin adı siler. */
  setDayTitle: (day: Date, title: string) => void;

  /* — Geri alma — */
  undo: () => void;

  /* — Yardımcılar — */
  resetToMock: () => void;
  clearDay: () => void;
  /** Senkron motoru sunucudan gelen birleşmiş listeyi buradan yazar. */
  replaceTasks: (tasks: Task[]) => void;
  /** Senkron motoru sunucudan gelen gün adlarını buradan yazar. */
  replaceDayTitles: (titles: Record<string, string>) => void;
};

export type TaskStore = TaskState & TaskActions;

/* -------------------------------------------------------------------------- */
/*  Yardımcılar                                                               */
/* -------------------------------------------------------------------------- */

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Geçmişte tutulacak en fazla kare sayısı. */
const HISTORY_LIMIT = 30;

/**
 * Değişiklikten ÖNCEKİ listeyi geçmişe bırakır.
 *
 * Her mutasyon aksiyonunun döndürdüğü nesneye yayılır:
 *   set((s) => ({ ...snapshot(s, 'blok silindi'), tasks: yeniListe }))
 *
 * Otomatik (subscribe ile fark alarak) yapmadım: o yöntem senkronun
 * sunucudan yazdığı değişiklikleri de geçmişe atardı ve "geri al"
 * uzaktaki bir düzenlemeyi geri alırdı.
 */
function snapshot(state: TaskStore, label: string): Pick<TaskStore, 'history'> {
  const kare = { tasks: state.tasks, dayTitles: state.dayTitles, label };
  return { history: [...state.history, kare].slice(-HISTORY_LIMIT) };
}

/** reflow sonucunu okunabilir bir kullanıcı mesajına çevirir. */
function toFeedback(result: ScheduleResult): FlowFeedback {
  if (result.conflict) {
    return { message: result.conflict, tone: 'warning' };
  }
  const parts: string[] = [];
  if (result.absorbedBufferIds.length > 0) {
    parts.push(`${result.absorbedBufferIds.length} tampon blok darbeyi emdi`);
  }
  if (result.shiftedTaskIds.length > 0) {
    parts.push(`${result.shiftedTaskIds.length} görev kaydırıldı`);
  }
  return parts.length > 0 ? { message: parts.join(', ') + '.', tone: 'info' } : null;
}

/* -------------------------------------------------------------------------- */
/*  Store                                                                     */
/* -------------------------------------------------------------------------- */

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: createMockTasks(),
      selectedDate: startOfDay(new Date()),
      selectedTaskId: null,
      editor: null,
      feedback: null,
      dayTitles: {},
      history: [],

      /* ---------------------------------------------------------------- */
      setSelectedDate: (date) => set({ selectedDate: startOfDay(date) }),
      goToPrevDay: () => set((s) => ({ selectedDate: addDays(s.selectedDate, -1) })),
      goToNextDay: () => set((s) => ({ selectedDate: addDays(s.selectedDate, 1) })),
      goToToday: () => set({ selectedDate: startOfDay(new Date()) }),

      /* ---------------------------------------------------------------- */
      addTask: (input) => {
        const id = createId();
        const task: Task = {
          id,
          title: input.title,
          description: input.description,
          startTime: input.startTime,
          endTime: input.endTime,
          category: input.category,
          isCompleted: input.isCompleted ?? false,
          isFixed: input.isFixed ?? false,
        };
        set((s) => ({
          ...snapshot(s, 'blok eklendi'),
          tasks: sortByStart([...s.tasks, task]),
        }));
        return id;
      },

      updateTask: (id, patch) => {
        const state = get();
        const next = state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));

        // Tek kural: saat neresinden değişirse değişsin (sürükleme, klavye,
        // düzenleme penceresi) tampon zinciri aynı şekilde işler.
        const timeChanged = patch.startTime !== undefined || patch.endTime !== undefined;
        if (!timeChanged) {
          set({ ...snapshot(state, 'blok düzenlendi'), tasks: sortByStart(next) });
          return;
        }

        const result = reflow(next, id);
        set({
          ...snapshot(state, 'blok düzenlendi'),
          tasks: sortByStart(result.tasks),
          feedback: toFeedback(result),
        });
      },

      deleteTask: (id) =>
        set((s) => ({
          ...snapshot(s, 'blok silindi'),
          tasks: s.tasks.filter((t) => t.id !== id),
          selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
          // Silinen görev düzenleniyorsa pencere de kapanmalı.
          editor: s.editor?.mode === 'edit' && s.editor.taskId === id ? null : s.editor,
        })),

      toggleComplete: (id) =>
        set((s) => ({
          ...snapshot(s, 'tamamlandı işareti'),
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, isCompleted: !t.isCompleted } : t,
          ),
        })),

      toggleFixed: (id) =>
        set((s) => ({
          ...snapshot(s, 'sabit işareti'),
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, isFixed: !t.isFixed } : t)),
        })),

      /* ---------------------------------------------------------------- */
      moveTask: (id, startMinutes) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === id);
        // isFixed yalnızca OTOMATİK kaydırmayı (reflow) engeller. Kullanıcı
        // bloğu eliyle sürüklüyorsa niyeti açıktır; buna izin veriyoruz.
        if (!task) return;

        const duration = getDurationMinutes(task);
        // 1) 15dk dilimine yapıştır, 2) gün sınırları içinde tut.
        const nextStart = clampStart(snapMinutes(startMinutes), duration);
        if (nextStart === getStartMinutes(task)) return;

        const moved = state.tasks.map((t) =>
          t.id === id ? withStartMinutes(t, nextStart) : t,
        );
        // 3) Taşıma sonrası oluşan çakışmaları tampon algoritmasıyla çöz.
        const result = reflow(moved, id);
        set({
          ...snapshot(state, 'blok taşındı'),
          tasks: sortByStart(result.tasks),
          feedback: toFeedback(result),
        });
      },

      resizeTask: (id, edge, minute) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;

        const snapped = snapMinutes(minute);
        const start = getStartMinutes(task);
        const end = start + getDurationMinutes(task);

        let next: Task;
        if (edge === 'end') {
          // Alt kenar: bitiş en az 15dk başlangıçtan sonra olmalı.
          const nextEnd = Math.min(
            DAY_END_MINUTE,
            Math.max(start + MIN_TASK_MINUTES, snapped),
          );
          next = withDuration(task, nextEnd - start);
        } else {
          // Üst kenar: başlangıç kayar, bitiş sabit kalır.
          const nextStart = Math.max(0, Math.min(snapped, end - MIN_TASK_MINUTES));
          next = {
            ...task,
            startTime: fromDayMinutes(task.startTime, nextStart),
          };
        }

        const resized = state.tasks.map((t) => (t.id === id ? next : t));
        const result = reflow(resized, id);
        set({
          ...snapshot(state, 'blok süresi değişti'),
          tasks: sortByStart(result.tasks),
          feedback: toFeedback(result),
        });
      },

      /* ---------------------------------------------------------------- */
      applyMagicSchedule: (text, options = {}) => {
        const state = get();
        const items = parseSchedulePrompt(text);

        if (items.length === 0) {
          set({
            feedback: {
              message: 'Metinden plan çıkaramadım. Örnek: "2 saat kod, 1 saat spor".',
              tone: 'warning',
            },
          });
          return { placed: 0, skipped: 0 };
        }

        const day = state.selectedDate;
        // Bugün planlanıyorsa geçmiş saatlere blok koymayız.
        const from = isToday(day) ? snapMinutes(toDayMinutes(new Date())) : 8 * 60;

        const { blocks, skipped } = planIntoDay(state.tasks, day, items, {
          from: clampStart(from, MIN_TASK_MINUTES),
          to: DAY_END_MINUTE,
          withBuffers: options.withBuffers ?? true,
        });

        const created: Task[] = blocks.map((block) => ({
          id: createId(),
          title: block.title,
          startTime: fromDayMinutes(day, block.start),
          endTime: fromDayMinutes(day, block.start + block.duration),
          category: block.category,
          isCompleted: false,
          isFixed: false,
        }));

        const placed = blocks.filter((b) => b.category !== 'BUFFER').length;
        const messages: string[] = [];
        if (placed > 0) messages.push(`${placed} blok yerleştirildi`);
        if (skipped.length > 0) messages.push(`${skipped.length} madde güne sığmadı`);

        set({
          ...snapshot(state, `${placed} blok dağıtıldı`),
          tasks: sortByStart([...state.tasks, ...created]),
          feedback:
            messages.length > 0
              ? {
                  message: messages.join(', ') + '.',
                  tone: skipped.length > 0 ? 'warning' : 'info',
                }
              : null,
        });

        return { placed, skipped: skipped.length };
      },

      /* ---------------------------------------------------------------- */
      selectTask: (id) => set({ selectedTaskId: id }),
      openCreateEditor: (start, duration) =>
        set({ editor: { mode: 'create', start, duration } }),
      openEditEditor: (taskId) =>
        set({ editor: { mode: 'edit', taskId }, selectedTaskId: taskId }),
      closeEditor: () => set({ editor: null }),
      clearFeedback: () => set({ feedback: null }),

      /* ---------------------------------------------------------------- */
      setDayTitle: (day, title) => {
        const anahtar = dayKey(day);
        const temiz = title.trim();

        set((s) => {
          const mevcut = s.dayTitles[anahtar] ?? '';
          if (mevcut === temiz) return {}; // değişiklik yok, geçmişi kirletme

          const sonraki = { ...s.dayTitles };
          if (temiz) sonraki[anahtar] = temiz;
          else delete sonraki[anahtar];

          return {
            ...snapshot(s, temiz ? 'gün adı değişti' : 'gün adı silindi'),
            dayTitles: sonraki,
          };
        });
      },

      /* ---------------------------------------------------------------- */
      undo: () => {
        const state = get();
        const last = state.history[state.history.length - 1];
        if (!last) return;

        set({
          tasks: last.tasks,
          dayTitles: last.dayTitles,
          history: state.history.slice(0, -1),
          feedback: { message: `Geri alındı: ${last.label}`, tone: 'info' },
          // Geri alınan blok silinmiş olabilir; açık pencere ve seçim
          // artık geçersiz olabileceği için temizliyoruz.
          selectedTaskId: null,
          editor: null,
        });
      },

      /* ---------------------------------------------------------------- */
      resetToMock: () =>
        set((s) => ({
          ...snapshot(s, 'örnek plan yüklendi'),
          tasks: createMockTasks(s.selectedDate),
          feedback: null,
        })),

      clearDay: () =>
        set((s) => ({
          ...snapshot(s, 'gün temizlendi'),
          tasks: s.tasks.filter((t) => !isTaskOnDay(t, s.selectedDate)),
          feedback: null,
        })),

      // Senkron yolu: geçmişe kare bırakmaz (bkz. history alanının açıklaması).
      replaceTasks: (tasks) => set({ tasks: sortByStart(tasks) }),
      replaceDayTitles: (titles) => set({ dayTitles: titles }),
    }),
    {
      name: STORAGE_KEY,
      // Date nesneleri JSON'da ISO string'e dönüşür; okurken geri çeviriyoruz.
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          if (
            (key === 'startTime' || key === 'endTime' || key === 'selectedDate') &&
            typeof value === 'string'
          ) {
            return new Date(value);
          }
          return value;
        },
      }),
      partialize: (state) => ({
        tasks: state.tasks,
        selectedDate: state.selectedDate,
        dayTitles: state.dayTitles,
      }),
      // SSR ile client arasında hydration uyuşmazlığı olmaması için
      // localStorage okuması mount sonrasına ertelenir (bkz. useHydratedStore).
      skipHydration: true,
    },
  ),
);

/* -------------------------------------------------------------------------- */
/*  Selector hook'ları                                                        */
/*                                                                            */
/*  ÖNEMLİ KURAL: Zustand selector'ı içinde ASLA yeni dizi/nesne üretme.      */
/*  useSyncExternalStore her render'da selector'ı çağırır; yeni referans      */
/*  "state değişti" sanılır ve sonsuz render döngüsü oluşur.                  */
/*  Bunun yerine store'dan referansı sabit alanları (tasks, selectedDate)     */
/*  okuyup türetmeyi useMemo içinde yapıyoruz.                                */
/* -------------------------------------------------------------------------- */

/** Seçili güne ait görevler, saate göre sıralı. */
export function useTasksForSelectedDay(): Task[] {
  const tasks = useTaskStore((s) => s.tasks);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  return useMemo(
    () => sortByStart(tasks.filter((t) => isTaskOnDay(t, selectedDate))),
    [tasks, selectedDate],
  );
}

/** Seçili güne ait boş zaman aralıkları (AI asistanı ve UI ipuçları için). */
export function useFreeSlots(minDuration = MIN_TASK_MINUTES): FreeSlot[] {
  const tasks = useTaskStore((s) => s.tasks);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  return useMemo(
    () => findFreeSlots(tasks, selectedDate, { minDuration }),
    [tasks, selectedDate, minDuration],
  );
}

/** Şu an seçili olan görev nesnesi. */
export function useSelectedTask(): Task | null {
  return useTaskStore((s) => s.tasks.find((t) => t.id === s.selectedTaskId) ?? null);
}
