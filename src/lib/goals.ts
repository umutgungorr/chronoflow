import { differenceInCalendarDays, isValid, parse } from 'date-fns';

/**
 * Hedefler — geri sayım matematiği.
 *
 * Saf ve tarihten bağımsız: "şimdi"yi parametre olarak alıyor ki test
 * edilebilsin ve gece yarısı geçerken kırılmasın.
 */

export type Goal = {
  id: string;
  title: string;
  note?: string;
  /** 'YYYY-MM-DD' — yüzdenin başlangıç noktası. */
  startDate: string;
  /** 'YYYY-MM-DD' — hedef gün. */
  targetDate: string;
};

/** 'YYYY-MM-DD' metnini YEREL gün başlangıcına çevirir. */
export function parseDayKey(key: string): Date | null {
  const parsed = parse(key, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
}

export type GoalProgress = {
  /** Bugünden hedefe kalan tam gün. Geçmişse negatif. */
  remainingDays: number;
  /** Başlangıçtan hedefe toplam gün (en az 1). */
  totalDays: number;
  /** Kalan yolun yüzdesi, 0-100. Kullanıcının istediği sayı bu. */
  remainingPercent: number;
  /** Geçen yolun yüzdesi, 0-100. İlerleme çubuğu bunu çiziyor. */
  elapsedPercent: number;
  /** Hedef günü geçti mi? */
  isPast: boolean;
  /** Hedef bugün mü? */
  isToday: boolean;
};

export function getGoalProgress(goal: Goal, now: Date): GoalProgress {
  const start = parseDayKey(goal.startDate);
  const target = parseDayKey(goal.targetDate);

  if (!start || !target) {
    return {
      remainingDays: 0,
      totalDays: 1,
      remainingPercent: 0,
      elapsedPercent: 100,
      isPast: true,
      isToday: false,
    };
  }

  const remainingDays = differenceInCalendarDays(target, now);
  // En az 1: aynı gün başlayıp aynı gün biten hedefte sıfıra bölmeyelim.
  const totalDays = Math.max(1, differenceInCalendarDays(target, start));
  const elapsedDays = totalDays - remainingDays;

  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const elapsedPercent = clamp((elapsedDays / totalDays) * 100);

  return {
    remainingDays,
    totalDays,
    remainingPercent: clamp(100 - elapsedPercent),
    elapsedPercent,
    isPast: remainingDays < 0,
    isToday: remainingDays === 0,
  };
}

/** "412 gün" / "bugün" / "3 gün geçti" */
export function formatRemaining(progress: GoalProgress): string {
  if (progress.isToday) return 'bugün';
  if (progress.isPast) return `${Math.abs(progress.remainingDays)} gün geçti`;
  return `${progress.remainingDays} gün`;
}

/** Yaklaşan önce; geçmiş hedefler en sona. */
export function sortGoals(goals: Goal[], now: Date): Goal[] {
  return [...goals].sort((a, b) => {
    const ka = getGoalProgress(a, now);
    const kb = getGoalProgress(b, now);
    if (ka.isPast !== kb.isPast) return ka.isPast ? 1 : -1;
    return ka.remainingDays - kb.remainingDays;
  });
}
