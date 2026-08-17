'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

import { isAdmin } from '@/lib/supabase/admin';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Kullanıcı yönetici mi?
 *
 * Cevap veritabanından geliyor (`admins` tablosu). Sonuç bir store'da
 * tutuluyor ki her sayfa geçişinde tekrar sorgu atılmasın.
 *
 * Bu bayrak yalnızca "Yönetim" sekmesini göstermek için. Gizlemek güvenlik
 * değil, düzen: yönetici olmayan biri adresi elle yazsa da RLS yüzünden
 * boş ekran görür.
 */

type AdminState = {
  isAdmin: boolean;
  /** Hangi kullanıcı için sorduk — aynı kişiyi iki kez sormayalım. */
  checkedFor: string | null;
  check: (userId: string) => Promise<void>;
};

export const useAdminStore = create<AdminState>()((set, get) => ({
  isAdmin: false,
  checkedFor: null,
  check: async (userId) => {
    if (get().checkedFor === userId) return;
    const sonuc = await isAdmin(userId);
    set({ isAdmin: sonuc, checkedFor: userId });
  },
}));

export function useIsAdmin(): boolean {
  const userId = useAuthStore((s) => s.userId);
  const check = useAdminStore((s) => s.check);
  const yonetici = useAdminStore((s) => s.isAdmin);

  useEffect(() => {
    if (userId) void check(userId);
  }, [userId, check]);

  return yonetici;
}
