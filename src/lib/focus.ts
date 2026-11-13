/**
 * Odak modu ve bildirim mantığı — saf fonksiyonlar, "şimdi" parametre.
 */

import { DAY_END_MINUTE } from '@/lib/constants';
import { dayKey, getEndMinutes, getStartMinutes, isTaskOnDay, toDayMinutes } from '@/lib/time';
import type { Task, TaskCategory } from '@/types';

/** Alt görev. Bloğa bağlıdır; ayrı bir listede (taskId → liste) tutulur. */
export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

/** Canlı odak oturumu: başlangıç anından bitiş anına kadar ChronoFlow takviminde canlı blok olarak yaşar. */
export type ActiveFocusSession = {
  taskId: string;
  title: string;
  category: TaskCategory;
  startedAt: string;
  startMinute: number;
  dayKey: string;
  dailyGoalId?: string;
};

export const DEFAULT_FOCUS_SUBJECTS: string[] = [
  'Paragraf',
  'Matematik',
  'Problemler',
  'Geometri',
  'Türkçe',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Coğrafya',
  'Deneme Analizi',
  'Kodlama',
];

/**
 * Canlı odak oturumunun verilen `now` anındaki bitiş dakikasını hesaplar.
 * Aynı gün içinde en az `startMinute + 1` (en az 1 dk), gün devrilmişse `DAY_END_MINUTE` (24:00) döner.
 */
export function computeFocusEndMinute(session: ActiveFocusSession, now: Date): number {
  if (dayKey(now) !== session.dayKey) {
    return DAY_END_MINUTE;
  }
  return Math.min(DAY_END_MINUTE, Math.max(session.startMinute + 1, toDayMinutes(now)));
}

/** Şu an süren blok (tampon hariç). Çakışma varsa en geç başlayan. */
export function findActiveTask(tasks: Task[], now: Date): Task | null {
  const minute = toDayMinutes(now);
  const active = tasks
    .filter(
      (t) =>
        t.category !== 'BUFFER' &&
        isTaskOnDay(t, now) &&
        getStartMinutes(t) <= minute &&
        minute < getEndMinutes(t),
    )
    .sort((a, b) => getStartMinutes(b) - getStartMinutes(a));
  return active[0] ?? null;
}

/** Bitişe kalan saniye (>= 0). */
export function secondsRemaining(task: Task, now: Date): number {
  return Math.max(0, Math.round((task.endTime.getTime() - now.getTime()) / 1000));
}

/** 'MM:SS' ya da 1 saati aşarsa 'H:MM:SS'. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/* -------------------------------------------------------------------------- */
/*  Pomodoro                                                                  */
/* -------------------------------------------------------------------------- */

export type PomodoroPhase = 'focus' | 'break';

export const POMODORO_FOCUS_SECONDS = 25 * 60;
export const POMODORO_BREAK_SECONDS = 5 * 60;

/**
 * Pomodoro evresi, başlangıçtan geçen süreye göre ZAMANLA TÜRETİLİR —
 * sayaç state'i tutmuyoruz, böylece sekme uyusa bile doğru kalır.
 */
export function pomodoroAt(elapsedSeconds: number): {
  phase: PomodoroPhase;
  remaining: number;
  cycle: number;
} {
  const cycleLength = POMODORO_FOCUS_SECONDS + POMODORO_BREAK_SECONDS;
  const elapsed = Math.max(0, elapsedSeconds);
  const cycle = Math.floor(elapsed / cycleLength);
  const within = elapsed % cycleLength;

  return within < POMODORO_FOCUS_SECONDS
    ? { phase: 'focus', remaining: POMODORO_FOCUS_SECONDS - within, cycle: cycle + 1 }
    : {
        phase: 'break',
        remaining: cycleLength - within,
        cycle: cycle + 1,
      };
}

/* -------------------------------------------------------------------------- */
/*  Bildirimler                                                               */
/* -------------------------------------------------------------------------- */

/** Başlamadan kaç dakika önce haber verilecek. */
export const NOTIFY_LEAD_MINUTES = 5;

/**
 * Şu anda bildirim verilmesi gereken bloklar: başlangıcına
 * 0 < kalan <= NOTIFY_LEAD_MINUTES dakika var. `notified` zaten haber
 * verilenlerin id'leri; çağıran taraf tekrar göndermemek için tutar.
 */
export function tasksToNotify(tasks: Task[], now: Date, notified: ReadonlySet<string>): Task[] {
  return tasks.filter((t) => {
    if (t.isCompleted || t.category === 'BUFFER' || notified.has(t.id)) return false;
    const leadMs = t.startTime.getTime() - now.getTime();
    return leadMs > 0 && leadMs <= NOTIFY_LEAD_MINUTES * 60_000;
  });
}
