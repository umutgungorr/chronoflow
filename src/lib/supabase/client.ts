'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { TaskCategory } from '@/types';

/**
 * Supabase istemcisi.
 *
 * ÖNEMLİ TASARIM KARARI: Supabase ZORUNLU DEĞİL.
 * Ortam değişkenleri yoksa `supabase` null döner ve uygulama bugünkü gibi
 * yerel modda (localStorage) çalışmaya devam eder. Böylece anahtarlar
 * gelene kadar hiçbir şey bozulmaz, geldiğinde de tek dosya değişmeden
 * senkron kendiliğinden devreye girer.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** Veritabanındaki satırın şekli (snake_case — SQL tarafının dili). */
export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  category: TaskCategory;
  is_completed: boolean;
  is_fixed: boolean;
  updated_at: string;
  deleted_at: string | null;
};

/**
 * supabase-js jeneriklerinin beklediği şema iskeleti.
 * Views/Functions/Enums/CompositeTypes boş da olsa BULUNMALI — eksikse
 * tip çözümlemesi `never`'a düşer ve upsert/update çağrıları derlenmez.
 */
/** Güne verilen ad. Anahtar (user_id, day); `day` yerel 'YYYY-MM-DD'. */
export type DayTitleRow = {
  user_id: string;
  day: string;
  title: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: TaskRow;
        Insert: Omit<TaskRow, 'updated_at' | 'deleted_at'> & {
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<TaskRow>;
        Relationships: [];
      };
      day_titles: {
        Row: DayTitleRow;
        Insert: Omit<DayTitleRow, 'updated_at' | 'deleted_at'> & {
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<DayTitleRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: {
        // Oturum tarayıcıda saklansın ve sekme açıldığında geri yüklensin;
        // telefonda her açılışta yeniden giriş yapmak istemiyoruz.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Yapılandırma yoksa çağıranın net bir hata alması için. */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      'Supabase yapılandırılmamış. .env.local içine NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin.',
    );
  }
  return supabase;
}
