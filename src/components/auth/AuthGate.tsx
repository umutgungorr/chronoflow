'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
} from 'lucide-react';

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
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-3 overflow-hidden bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute size-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-canvas/90 shadow-lg">
          <Image
            src="/logo.png"
            alt="ChronoFlow"
            width={28}
            height={28}
            priority
            className="size-7 object-contain drop-shadow-[0_0_12px_rgba(46,230,184,0.35)]"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-primary" aria-label="Yükleniyor" />
          <span className="font-mono tracking-wider uppercase">ChronoFlow</span>
        </div>
      </div>
    );
  }

  if (status === 'signed-in' || status === 'local') return <>{children}</>;

  return <SignInScreen />;
}

const PREVIEW_BLOCKS = [
  {
    time: '13:30 – 14:40',
    duration: '1s 10dk',
    title: 'Paragraf · Hızlı Okuma',
    done: true,
    accent: 'bg-blue-500',
    buffer: false,
  },
  {
    time: '14:40 – 15:00',
    duration: '20dk',
    title: 'MOLA',
    done: false,
    accent: 'bg-zinc-500',
    buffer: true,
  },
  {
    time: '15:00 – 16:30',
    duration: '1s 30dk',
    title: 'Matematik · Basit Eşitsizlikler',
    done: false,
    accent: 'bg-primary',
    buffer: false,
    live: true,
  },
] as const;

const HIGHLIGHTS = [
  { icon: Clock3, text: 'Esnek blok & akıllı tampon' },
  { icon: Flame, text: 'Canlı odak zamanlayıcısı' },
  { icon: RefreshCw, text: 'Tüm cihazlarda anlık senkron' },
] as const;

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
  const passwordValid = password.length >= 6;
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
      setLocalError('E-posta adresini yazmalısın.');
      return;
    }
    if (!password) {
      setLocalError('Şifreni yazmalısın.');
      return;
    }
    if (isSignUp && !passwordValid) {
      setLocalError('Şifre en az 6 karakter olmalı.');
      return;
    }

    setLocalError(null);
    if (mode === 'signin') await signIn(cleanEmail, password);
    else await signUp(cleanEmail, password);
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6">
      {/* İnce cetvel ızgarası + turkuaz ortam ışığı */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--rule-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--rule-soft) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 left-1/4 size-[28rem] rounded-full bg-primary/12 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-32 right-1/5 size-[24rem] rounded-full bg-primary/10 blur-[100px]"
      />

      <div className="relative z-10 grid w-full max-w-4xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
        {/* Sol tanıtım ve canlı zaman tüneli önizlemesi (masaüstü) */}
        <section className="hidden flex-col gap-6 lg:flex" aria-hidden>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-canvas/90 shadow-[0_0_24px_rgba(46,230,184,0.16)]">
              <Image
                src="/logo.png"
                alt=""
                width={30}
                height={30}
                priority
                className="size-7 object-contain drop-shadow-[0_0_12px_rgba(46,230,184,0.35)]"
              />
            </div>
            <div>
              <span className="block text-lg font-semibold tracking-tight text-foreground">
                ChronoFlow
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                Zaman Bloklama & Odak
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-foreground">
              Günü saat saat kur.
              <span className="block text-primary">Dikkatin bölünmeden akışa geç.</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Derslerini ve hedeflerini zaman tüneline diz, canlı odak modunda çalıştığın dakikaları
              otomatik işle, tüm cihazlarından kaldığın yerden devam et.
            </p>
          </div>

          {/* Mini zaman çizelgesi önizleme kartı */}
          <div className="rounded-2xl border border-border/80 bg-canvas/85 p-4 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.65)] backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Örnek Gün Akışı
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                Canlı takip
              </span>
            </div>

            <div className="space-y-2">
              {PREVIEW_BLOCKS.map((block) => (
                <div
                  key={block.title}
                  className={cn(
                    'relative flex items-center justify-between overflow-hidden rounded-xl border px-3 py-2.5 text-xs',
                    block.buffer
                      ? 'border-dashed border-border/80 bg-muted/25 text-muted-foreground'
                      : 'live' in block && block.live
                        ? 'border-primary/50 bg-primary/[0.06] text-foreground shadow-[0_0_24px_-10px_rgba(46,230,184,0.45)]'
                        : 'border-border/70 bg-background/60 text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'absolute inset-y-1.5 left-1 w-1 rounded-full',
                      block.accent,
                      block.buffer && 'opacity-40',
                    )}
                  />
                  <div className="pl-2.5">
                    <p className={cn('font-medium', block.done && 'line-through opacity-75')}>
                      {block.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {block.time} · {block.duration}
                    </p>
                  </div>
                  {block.done ? (
                    <span className="flex size-5 items-center justify-center rounded-full border border-primary/50 bg-primary/15 text-primary">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                  ) : 'live' in block && block.live ? (
                    <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                      Odakta
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="size-3.5 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Sağ auth kartı */}
        <section className="mx-auto w-full max-w-[26rem]">
          {/* Mobil marka başlığı */}
          <div className="mb-6 flex flex-col items-center gap-2.5 text-center lg:hidden">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-canvas/90 shadow-[0_0_24px_rgba(46,230,184,0.18)]">
              <Image
                src="/logo.png"
                alt="ChronoFlow Logo"
                width={32}
                height={32}
                priority
                className="size-8 object-contain drop-shadow-[0_0_12px_rgba(46,230,184,0.35)]"
              />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight text-foreground">ChronoFlow</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                Günlük Zaman Bloklama
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/85 bg-canvas/95 p-6 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-7">
            {/* Üst turkuaz ince parıltı çizgisi */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />

            {/* Mod seçici sekmeler */}
            <div
              role="tablist"
              aria-label="Hesap modu"
              className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-background/70 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isSignUp}
                onClick={() => switchMode('signin')}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !isSignUp
                    ? 'bg-canvas text-foreground shadow-sm ring-1 ring-border/80'
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
                  'rounded-lg px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSignUp
                    ? 'bg-canvas text-foreground shadow-sm ring-1 ring-border/80'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Hesap oluştur
              </button>
            </div>

            <div className="mb-5 space-y-1">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                {isSignUp ? 'Yeni hesap oluştur' : 'Planına geri dön'}
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isSignUp
                  ? 'Bu cihazdaki mevcut planın otomatik olarak yeni hesabına taşınır.'
                  : 'Giriş yaptığında blokların ve hedeflerin tüm cihazlarında senkronlanır.'}
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="auth-email" className="text-xs font-medium text-foreground/90">
                  E-posta
                </Label>
                <div className="relative">
                  <Mail
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="ornek@posta.com"
                    className="h-10 rounded-xl pl-9 text-sm"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (localError) setLocalError(null);
                      if (error) clearError();
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-password" className="text-xs font-medium text-foreground/90">
                  Şifre
                </Label>
                <div className="relative">
                  <Lock
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                    className="h-10 rounded-xl pr-10 pl-9 text-sm"
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
                    className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {isSignUp && (
                  <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
                    <CheckCircle2
                      className={cn(
                        'size-3.5 transition-colors',
                        passwordValid ? 'text-primary' : 'text-muted-foreground/50',
                      )}
                    />
                    <span
                      className={cn(
                        'transition-colors',
                        passwordValid ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      En az 6 karakter
                    </span>
                  </div>
                )}
              </div>

              {displayedError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-snug text-amber-800 dark:text-amber-200"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
                  <span>{displayedError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="h-10 w-full gap-2 rounded-xl text-sm font-medium shadow-[0_0_24px_-6px_rgba(46,230,184,0.45)]"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                {isSignUp ? 'Hesap oluştur ve başla' : 'Giriş yap'}
              </Button>
            </form>

            <div className="mt-5 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
              {isSignUp ? 'Zaten bir hesabın var mı?' : 'ChronoFlow’da yeni misin?'}{' '}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => switchMode(isSignUp ? 'signin' : 'signup')}
              >
                {isSignUp ? 'Giriş yap' : 'Hemen hesap oluştur'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
