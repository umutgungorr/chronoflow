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
    let boundaryTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleBoundary = () => {
      clearTimeout(boundaryTimer);
      // Bir sonraki dakikanın tam başında (00. saniyede) rozet anında dönsün.
      const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50;
      boundaryTimer = setTimeout(() => {
        setMinute(toDayMinutes(new Date()));
        scheduleBoundary();
      }, msToNextMinute);
    };

    const tick = () => {
      setMinute(toDayMinutes(new Date()));
      scheduleBoundary();
    };

    tick();

    // Saniyede bir kontrol: React aynı dakika değerinde re-render yapmaz,
    // ancak dakika değiştiği anda (00. saniyede) ve arka plan uykusundan dönüşte
    // çizginin eski dakikada takılı kalmasını tamamen önler.
    const interval = setInterval(() => {
      setMinute(toDayMinutes(new Date()));
    }, 1_000);

    // Sekmeye/pencereye dönüşte donmayı önleyen anlık dinleyiciler
    const onFocus = () => tick();
    const onPageShow = () => tick();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(boundaryTimer);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return minute;
}
