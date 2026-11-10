'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * AI route'larına istek atar. Oturum varsa jetonu ekler (sunucu doğrular).
 * Her türlü hata/yapılandırma eksikliğinde null döner → çağıran yerel
 * (kural tabanlı) yönteme düşer. AI hiçbir zaman zorunlu değildir.
 */
export async function postAi<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const { data } = (await supabase?.auth.getSession()) ?? { data: null };
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;

    const json = (await response.json()) as T & { ok?: boolean };
    return json.ok ? json : null;
  } catch {
    return null;
  }
}
