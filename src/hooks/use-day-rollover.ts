'use client';

import { useEffect } from 'react';

import { useTaskStore } from '@/store/useTaskStore';

/**
 * Gün devri.
 *
 * Uygulama telefonda ana ekrandan açıldığında çoğu zaman sayfa yeniden
 * yüklenmez, uykudan uyanır. O yüzden "gece yarısı geçti mi" sorusunu
 * sayfa açılışında sormak yetmiyor: pencereye her dönüşte ve dakikada bir
 * tekrar soruyoruz.
 *
 * Kullanıcı bilerek başka bir güne gittiyse dokunmuyoruz — kararı store
 * veriyor (bkz. rolloverToToday).
 */
export function useDayRollover() {
  const rolloverToToday = useTaskStore((s) => s.rolloverToToday);

  useEffect(() => {
    const kontrol = () => rolloverToToday(new Date());

    kontrol();
    const zamanlayici = setInterval(kontrol, 60_000);
    window.addEventListener('focus', kontrol);
    document.addEventListener('visibilitychange', kontrol);

    return () => {
      clearInterval(zamanlayici);
      window.removeEventListener('focus', kontrol);
      document.removeEventListener('visibilitychange', kontrol);
    };
  }, [rolloverToToday]);
}
