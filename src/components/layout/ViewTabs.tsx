'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';

import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: 'Gün', icon: Calendar },
  { href: '/hafta', label: 'Hafta', icon: CalendarRange },
  { href: '/hedefler', label: 'Hedefler', icon: CalendarDays },
] as const;

/** Üst bardaki Gün | Hafta | Hedefler görünüm seçicisi. */
export function ViewTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Görünüm" className="flex items-center gap-1.5 text-xs">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'border border-primary/70 bg-primary/15 text-primary shadow-[0_0_16px_-4px_var(--primary)]'
                : 'border border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
