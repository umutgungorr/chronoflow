'use client';

import { useEffect } from 'react';

import { useTaskStore } from '@/store/useTaskStore';

/**
 * Aktif canlı odak oturumu varken ChronoFlow takvimindeki bloğun bitiş saatini
 * güncel dakikaya eşitler. Sekme uyusa bile odak/visibility dönüşünde yakalar.
 */
export function useFocusSessionSync(): void {
  const hasSession = useTaskStore((s) => s.activeFocusSession !== null);
  const syncActiveFocusSession = useTaskStore((s) => s.syncActiveFocusSession);

  useEffect(() => {
    if (!hasSession) return;

    syncActiveFocusSession();
    const interval = setInterval(() => syncActiveFocusSession(), 10_000);
    const onFocus = () => syncActiveFocusSession();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncActiveFocusSession();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hasSession, syncActiveFocusSession]);
}
