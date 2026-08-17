'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * Yönetici verileri.
 *
 * Yetki kontrolü BURADA değil, veritabanında: `admin_users()` fonksiyonu ve
 * `visits` tablosunun okuma politikası çağıranın `admins` tablosunda olup
 * olmadığına bakıyor. Yönetici olmayan biri bu fonksiyonları çağırsa boş
 * liste alır — istemci tarafında saklanan bir sır yok.
 */

export type AdminUser = {
  userId: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  taskCount: number;
  goalCount: number;
};

export type VisitRow = {
  id: number;
  occurredAt: string;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  path: string | null;
  referer: string | null;
};

export async function isAdmin(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !error && data !== null;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_users');
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    userId: String(row.user_id),
    email: (row.email as string | null) ?? null,
    createdAt: String(row.created_at),
    lastSignInAt: (row.last_sign_in_at as string | null) ?? null,
    taskCount: Number(row.task_count ?? 0),
    goalCount: Number(row.goal_count ?? 0),
  }));
}

export async function fetchVisits(limit = 100): Promise<VisitRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id),
    occurredAt: String(row.occurred_at),
    userId: (row.user_id as string | null) ?? null,
    ip: (row.ip as string | null) ?? null,
    userAgent: (row.user_agent as string | null) ?? null,
    path: (row.path as string | null) ?? null,
    referer: (row.referer as string | null) ?? null,
  }));
}

/** "Chrome · Windows" — uzun user agent metnini okunur hâle getirir. */
export function describeUserAgent(ua: string | null): string {
  if (!ua) return '—';

  const tarayici =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : /Firefox\//.test(ua) ? 'Firefox'
    : 'Bilinmeyen';

  const sistem =
    /iPhone|iPad/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : 'Bilinmeyen';

  return `${tarayici} · ${sistem}`;
}
