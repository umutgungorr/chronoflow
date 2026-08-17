'use client';

import { useEffect, useRef } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

/**
 * Açılışta bir kez ziyaret kaydı bırakır.
 *
 * Kendi IP'mizi bilemediğimiz için satırı sunucu yazıyor; biz sadece
 * "buradayım" diyoruz ve varsa oturum jetonumuzu veriyoruz ki kaydın
 * kime ait olduğu doğrulanabilsin (bkz. /api/visit).
 *
 * Sekme başına tek kayıt: her yeniden render'da istek atmıyoruz.
 */
export function useVisitLog() {
  const gonderildi = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured || gonderildi.current) return;
    gonderildi.current = true;

    const bildir = async () => {
      let accessToken: string | undefined;
      let userId: string | undefined;

      try {
        const { data } = (await supabase?.auth.getSession()) ?? { data: null };
        accessToken = data?.session?.access_token;
        userId = data?.session?.user.id;
      } catch {
        // Oturum okunamadıysa anonim kayıt bırakılır.
      }

      try {
        await fetch('/api/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: window.location.pathname, accessToken, userId }),
          keepalive: true,
        });
      } catch {
        // Ziyaret kaydı asla uygulamayı etkilemesin.
      }
    };

    void bildir();
  }, []);
}
