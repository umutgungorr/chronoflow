'use client';

import { create } from 'zustand';

import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

/**
 * Oturum durumu.
 *
 * Supabase yapılandırılmamışsa durum doğrudan `local` olur ve uygulama
 * giriş ekranı göstermeden, bugüne kadar olduğu gibi yerel modda çalışır.
 */
export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'local';

type AuthState = {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  /** Formda gösterilecek hata (Türkçeleştirilmiş). */
  error: string | null;
  busy: boolean;
};

type AuthActions = {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

/**
 * Supabase hata mesajlarını okunur Türkçeye çevirir.
 *
 * Mümkün olduğunda `code` üzerinden eşleştiriyoruz: metin sürümle değişebilir,
 * kod sabit kalır.
 */
function translateError(message: string, code?: string): string {
  if (code === 'signup_disabled') return 'Yeni kayıt kapalı. Hesabın varsa giriş yap.';
  if (code === 'invalid_credentials') return 'E-posta veya şifre hatalı.';
  if (code === 'user_already_exists') return 'Bu e-posta zaten kayıtlı. Giriş yap.';
  if (code === 'weak_password') return 'Şifre en az 6 karakter olmalı.';

  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Bu e-posta zaten kayıtlı. Giriş yap.';
  }
  // Supabase'de "Allow new users to sign up" kapalıyken gelen yanıt.
  if (lower.includes('signups not allowed') || lower.includes('signup is disabled')) {
    return 'Yeni kayıt kapalı. Hesabın varsa giriş yap.';
  }
  if (lower.includes('password should be at least')) {
    return 'Şifre en az 6 karakter olmalı.';
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'E-posta adresi geçersiz.';
  }
  if (lower.includes('email not confirmed')) {
    return 'E-posta onayı bekleniyor. Supabase panelinde "Confirm email" kapalı olmalı.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
  }
  return message;
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  status: 'loading',
  userId: null,
  email: null,
  error: null,
  busy: false,

  initialize: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'local' });
      return;
    }

    const { data } = await supabase.auth.getSession();
    const session = data.session;
    set(
      session
        ? { status: 'signed-in', userId: session.user.id, email: session.user.email ?? null }
        : { status: 'signed-out', userId: null, email: null },
    );

    // Oturum yenilendiğinde veya başka sekmede çıkış yapıldığında haberdar ol.
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      set(
        nextSession
          ? {
              status: 'signed-in',
              userId: nextSession.user.id,
              email: nextSession.user.email ?? null,
            }
          : { status: 'signed-out', userId: null, email: null },
      );
    });
  },

  signIn: async (email, password) => {
    if (!supabase) return false;
    set({ busy: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({
      busy: false,
      error: error ? translateError(error.message, error.code) : null,
    });
    return !error;
  },

  signUp: async (email, password) => {
    if (!supabase) return false;
    set({ busy: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      set({ busy: false, error: translateError(error.message, error.code) });
      return false;
    }

    // "Confirm email" açık kalmışsa Supabase kullanıcı yaratır ama oturum
    // vermez. Sessizce takılı kalmak yerine sebebini söylüyoruz.
    if (!data.session) {
      set({
        busy: false,
        error:
          'Hesap oluştu ama oturum açılmadı. Supabase panelinde Authentication → Sign In / Providers → "Confirm email" kapalı olmalı.',
      });
      return false;
    }

    set({ busy: false, error: null });
    return true;
  },

  signOut: async () => {
    if (!supabase) return;
    set({ busy: true });
    await supabase.auth.signOut();
    set({ busy: false, status: 'signed-out', userId: null, email: null });
  },

  clearError: () => set({ error: null }),
}));
