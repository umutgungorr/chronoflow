'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: 'Gün' },
  { href: '/hafta', label: 'Hafta' },
] as const;

/** Başlığın altındaki Gün | Hafta görünüm geçişi. */
export function ViewTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Görünüm" className="flex items-center gap-2 text-xs">
      {TABS.map((tab, index) => {
        const active = pathname === tab.href;
        return (
          <span key={tab.href} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted-foreground/30" aria-hidden>|</span>}
            <Link
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
