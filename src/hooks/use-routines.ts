'use client';

import { useEffect } from 'react';

import { useTaskStore } from '@/store/useTaskStore';

/**
 * Seçili güne ait rutinleri (henüz işlenmemişse) yerleştirir.
 * Gün değişince ve rutin listesi değişince çalışır; aynı gün için tekrar
 * blok üretmez (bkz. routineApplied).
 */
export function useRoutines() {
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const routines = useTaskStore((s) => s.routines);
  const applyRoutinesToDay = useTaskStore((s) => s.applyRoutinesToDay);

  useEffect(() => {
    applyRoutinesToDay(selectedDate);
  }, [selectedDate, routines, applyRoutinesToDay]);
}
