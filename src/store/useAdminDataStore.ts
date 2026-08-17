'use client';

import { create } from 'zustand';

import {
  fetchAdminUsers,
  fetchVisits,
  isAdmin,
  type AdminUser,
  type VisitRow,
} from '@/lib/supabase/admin';

/**
 * Yönetim sayfasının verisi.
 *
 * Neden store? Veri çekme React state'i yerine burada duruyor çünkü
 * efekt içinden setState çağırmak (React'in yeni kuralı) kaçınılması
 * gereken bir kalıp. Store'a yazmak efektin dışında bir "dış sistem"
 * güncellemesi sayılıyor — hem kurala uyuyor hem de sayfa geçişlerinde
 * veri elde kalıyor.
 */

type AdminDataState = {
  yetkili: boolean | null;
  users: AdminUser[];
  visits: VisitRow[];
  yukleniyor: boolean;
  load: (userId: string) => Promise<void>;
};

export const useAdminDataStore = create<AdminDataState>()((set) => ({
  yetkili: null,
  users: [],
  visits: [],
  yukleniyor: true,

  load: async (userId) => {
    set({ yukleniyor: true });

    const admin = await isAdmin(userId);
    if (!admin) {
      set({ yetkili: false, users: [], visits: [], yukleniyor: false });
      return;
    }

    const [users, visits] = await Promise.all([fetchAdminUsers(), fetchVisits()]);
    set({ yetkili: true, users, visits, yukleniyor: false });
  },
}));
