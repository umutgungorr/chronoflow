'use client';

import { useEffect, useState } from 'react';

import { toDayMinutes } from '@/lib/time';

/**
 * Şu anın gün içi dakika karşılığını döndürür (00:00'dan itibaren).
 *
 * Mount edilene kadar `null` döner (SSR uyumu).
 *
 * Tarayıcılar arka plandaki sekmelerde `setInterval` ve `setTimeout`
 * zamanlayıcılarını uyutabilir veya dakikalarca durdurabilir. Çizginin
 * eski bir dakikada donup takılı kalmasını önlemek için:
 * 1. Her 10 saniyede bir periyodik kontrol yapılır.
 * 2. Sekmeye geri dönüldüğünde (visibilitychange) saat anında güncellenir.
 * 3. Pencereye odaklanıldığında (focus) anında güncellenir.
 */
export function useCurrentMinute(): number | null {
  const [minute, setMinute] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setMinute(toDayMinutes(new Date()));
    };

    tick();

    // 10 saniyede bir periyodik tazeleme
    const interval = setInterval(tick, 10_000);

    // Sekmeye/pencereye dönüşte donmayı önleyen anlık dinleyiciler
    const onFocus = () => tick();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return minute;
}
