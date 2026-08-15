'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Uygulamanın kapısı.
 *
 * Supabase yapılandırılmamışsa (durum `local`) hiçbir şey sormaz, uygulamayı
 * doğrudan açar. Yapılandırılmışsa oturum yoksa giriş ekranını gösterir.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (status === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Yükleniyor" />
      </div>
    );
  }

  if (status === 'signed-in' || status === 'local') return <>{children}</>;

  return <SignInScreen />;
}

function SignInScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    if (mode === 'signin') await signIn(email.trim(), password);
    else await signUp(email.trim(), password);
  };

  return (
    <div className="flex h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            ChronoFlow
          </p>
          <h1 className="text-2xl font-semibold leading-none tracking-[-0.03em]">
            {mode === 'signin' ? 'Planına dön' : 'Hesabını oluştur'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Girdiğinde planın tüm cihazlarında aynı olur.'
              : 'Bu bilgisayardaki mevcut planın hesabına taşınacak.'}
          </p>
        </div>

        <form
          className="space-y-4 rounded-xl border bg-canvas p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">E-posta</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) clearError();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Şifre</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) clearError();
              }}
            />
            {mode === 'signup' && (
              <p className="text-[11px] text-muted-foreground">En az 6 karakter.</p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-amber-100 px-3 py-2 text-[13px] leading-snug text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
            >
              {error}
            </p>
          )}

          <Button type="submit" className="w-full gap-2" disabled={busy}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}
          </Button>
        </form>

        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          {mode === 'signin' ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-2"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              clearError();
            }}
          >
            {mode === 'signin' ? 'Hesap oluştur' : 'Giriş yap'}
          </button>
        </p>
      </div>
    </div>
  );
}
