'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
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

/** Yeni ChronoFlow marka logosu. */
function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center shrink-0', className)}>
      <Image
        src="/logo.png"
        alt="ChronoFlow Logo"
        width={44}
        height={44}
        priority
        className="size-full object-contain drop-shadow-[0_0_14px_rgba(46,230,184,0.35)]"
      />
    </div>
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

      {/* Ana plan sayfasında (/) iç takvim ızgarası kendi içinde kayar.
          Dış kabukta da overflow-y-auto olursa çift scrollbar oluşur ve
          kaydırma takılır. Diğer sayfalarda dikey akış serbesttir. */}
      <div
        className={cn(
          'min-h-0 min-w-0 flex-1',
          pathname === '/' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto',
        )}
      >
        {children}
      </div>

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
