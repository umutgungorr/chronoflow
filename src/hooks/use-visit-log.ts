'use client';

import { useEffect } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

const SESSION_KEY = 'chronoflow:visit-logged';
const loggedUsersInMemory = new Set<string>();

function hasLoggedInSession(userId: string): boolean {
  if (loggedUsersInMemory.has(userId)) return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === userId;
  } catch {
    return false;
  }
}

function markLoggedInSession(userId: string): void {
  loggedUsersInMemory.add(userId);
  try {
    window.sessionStorage.setItem(SESSION_KEY, userId);
  } catch {
    // Depolama engelliyse bellek içi set aynı sekmede yeterli.
  }
}

/**
 * Oturum başına bir kez ziyaret kaydı bırakır.
 *
 * Kendi IP'mizi bilemediğimiz için satırı sunucu yazıyor; biz sadece
 * "buradayım" diyoruz ve oturum jetonumuzu veriyoruz ki kaydın
 * kime ait olduğu doğrulanabilsin (bkz. /api/visit).
 *
 * Yalnızca giriş yapmış kullanıcılar kaydedilir. Sayfalar arası geçişte
 * veya yenilemede tekrar istek atmamak için sekme oturumu bazında tek kayıt bırakılır.
 */
export function useVisitLog() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    const bildir = async () => {
      let accessToken: string | undefined;
      let userId: string | undefined;
      try {
        const { data } = (await supabase?.auth.getSession()) ?? { data: null };
        accessToken = data?.session?.access_token;
        userId = data?.session?.user?.id;
      } catch {
        // Oturum okunamadıysa ziyaret kaydı gönderilmez.
      }

      if (cancelled || !accessToken || !userId || hasLoggedInSession(userId)) return;

      // Aynı sekmede hızlı sayfa geçişlerinde çift istek atmamak için önce işaretle.
      markLoggedInSession(userId);

      try {
        await fetch('/api/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
          keepalive: true,
        });
      } catch {
        // Ziyaret kaydı asla uygulamayı etkilemesin.
      }
    };

    void bildir();
    return () => {
      cancelled = true;
    };
  }, []);
}
