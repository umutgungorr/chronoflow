'use client';

import { useEffect, useState } from 'react';

import { useTaskStore } from '@/store/useTaskStore';

/**
 * Zustand persist `skipHydration: true` ile kurulduğu için localStorage
 * okuması burada, mount sonrasında tetiklenir.
 *
 * Neden? Sunucu HTML'i mock veriyle render eder; tarayıcıda localStorage
 * farklı olabilir. Mount öncesi okursak React "hydration mismatch" hatası verir.
 * Bu hook `false` döndüğü sürece takvim yerine iskelet (skeleton) gösterilir.
 */
export function useHydratedStore(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(useTaskStore.persist.rehydrate()).then(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return hydrated;
}
