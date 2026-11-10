'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarRange, Flame, LayoutGrid, ShieldCheck, Target, TrendingUp } from 'lucide-react';

import { useIsAdmin } from '@/hooks/use-is-admin';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Plan', icon: LayoutGrid },
  { href: '/hafta', label: 'Hafta', icon: CalendarRange },
  { href: '/odak', label: 'Odak', icon: Flame },
  { href: '/hedefler', label: 'Hedefler', icon: Target },
] as const;

const ADMIN_ITEM = { href: '/admin', label: 'Yönetim', icon: ShieldCheck } as const;

/** Marka işareti: iki zıt eğimli şerit — akan zamanı simgeleyen "S". */
function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="cf-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5af5d2" />
          <stop offset="1" stopColor="#12a8c9" />
        </linearGradient>
      </defs>
      <path d="M6 4h20v6l-8 6 8 6v6H6v-6l8-6-8-6V4Z" fill="url(#cf-logo)" opacity="0.92" />
      <path d="M10 8h12v1.6L16 14l-6-4.4V8Z" fill="#05080c" opacity="0.55" />
    </svg>
  );
}

/**
 * Uygulama kabuğu: geniş ekranda sol kenar çubuğu, telefonda alt çubuk.
 * İçerik kendi alanında kaydırılır; kenar çubuğu yerinde kalır.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <aside className="relative hidden w-56 shrink-0 flex-col overflow-hidden border-r bg-sidebar/80 px-3 py-6 lg:flex">
        {/* Alt köşedeki turkuaz ışıma. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/15 blur-3xl"
        />

        <div className="relative mb-8 flex flex-col items-center gap-2">
          <Logo className="size-10" />
          <span className="text-lg font-semibold tracking-tight">ChronoFlow</span>
        </div>

        <nav className="relative flex flex-col gap-1" aria-label="Ana menü">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_30%,transparent)]'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="relative mt-auto flex items-end justify-between gap-2 px-2 pt-8">
          <p className="text-xs leading-snug text-muted-foreground">
            Daha verimli
            <br />
            bir sen için.
          </p>
          <TrendingUp className="size-7 text-primary" aria-hidden />
        </div>
      </aside>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>

      <nav
        aria-label="Ana menü"
        className="flex shrink-0 items-center justify-around border-t bg-sidebar/95 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-14 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px] font-medium',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
