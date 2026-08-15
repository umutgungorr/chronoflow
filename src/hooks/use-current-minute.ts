'use client';

import { useEffect, useState } from 'react';

import { toDayMinutes } from '@/lib/time';

/**
 * Şu anın gün içi dakika karşılığını döndürür (00:00'dan itibaren).
 *
 * Mount edilene kadar `null` döner: sunucuda render edilen HTML ile
 * tarayıcıdaki saat farklı olacağı için "şimdi" çizgisi yalnızca
 * istemcide çizilir.
 *
 * Bir sonraki tam dakikaya kadar bekleyip sonra 60sn'de bir günceller;
 * böylece çizgi saat değişimiyle senkron ilerler.
 */
export function useCurrentMinute(): number | null {
  const [minute, setMinute] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMinute(toDayMinutes(new Date()));
    tick();

    let interval: ReturnType<typeof setInterval>;
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return minute;
}
