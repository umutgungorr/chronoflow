'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
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
      <div className="flex min-h-dvh items-center justify-center bg-background">
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
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';
  const displayedError = localError ?? error;

  const switchMode = (nextMode: 'signin' | 'signup') => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLocalError('E-posta adresini yaz.');
      return;
    }
    if (!password) {
      setLocalError('Şifreni yaz.');
      return;
    }
    if (isSignUp && password.length < 6) {
      setLocalError('Şifre en az 6 karakter olmalı.');
      return;
    }

    setLocalError(null);
    if (mode === 'signin') await signIn(cleanEmail, password);
    else await signUp(cleanEmail, password);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="ChronoFlow"
            width={24}
            height={24}
            priority
            className="size-6 object-contain"
          />
          <span className="text-sm font-semibold tracking-tight text-foreground">ChronoFlow</span>
        </div>

        <div className="mb-5 space-y-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-foreground">
            {isSignUp ? 'Hesap oluştur' : 'Giriş yap'}
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {isSignUp
              ? 'Bu cihazdaki planın yeni hesabına aktarılır.'
              : 'Planın ve hedeflerin tüm cihazlarında aynı kalır.'}
          </p>
        </div>

        <div className="rounded-xl border bg-canvas p-5">
          <div
            role="tablist"
            aria-label="Hesap işlemi"
            className="mb-5 grid grid-cols-2 rounded-lg border bg-background p-0.5 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isSignUp}
              onClick={() => switchMode('signin')}
              className={cn(
                'rounded-md py-1.5 font-medium transition-colors',
                !isSignUp
                  ? 'bg-canvas text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Giriş yap
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignUp}
              onClick={() => switchMode('signup')}
              className={cn(
                'rounded-md py-1.5 font-medium transition-colors',
                isSignUp
                  ? 'bg-canvas text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Hesap oluştur
            </button>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="auth-email" className="text-xs text-muted-foreground">
                E-posta
              </Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="ad@ornek.com"
                className="h-9"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (localError) setLocalError(null);
                  if (error) clearError();
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="auth-password" className="text-xs text-muted-foreground">
                Şifre
              </Label>
              <div className="relative">
                <Input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="h-9 pr-9"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (localError) setLocalError(null);
                    if (error) clearError();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              {isSignUp && (
                <p
                  className={cn(
                    'text-[11px] transition-colors',
                    password.length >= 6 ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  En az 6 karakter
                </p>
              )}
            </div>

            {displayedError && (
              <p
                role="alert"
                className="rounded-lg bg-amber-100 px-3 py-2 text-xs leading-snug text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
              >
                {displayedError}
              </p>
            )}

            <Button type="submit" className="h-9 w-full gap-2" disabled={busy}>
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {isSignUp ? 'Hesap oluştur' : 'Giriş yap'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
