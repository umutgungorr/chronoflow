'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useIsAdmin } from '@/hooks/use-is-admin';
import { cn } from '@/lib/utils';

const SEKMELER = [
  { href: '/', label: 'Plan' },
  { href: '/hedefler', label: 'Hedefler' },
] as const;

/** Yönetim sekmesi yalnızca yöneticiye görünür (bkz. useIsAdmin). */
const YONETIM = { href: '/admin', label: 'Yönetim' } as const;

/**
 * Marka + sekmeler. Uygulamanın mikro tipografisiyle aynı dilde:
 * mono, küçük, geniş harf aralığı. Aktif sekme tam mürekkep, diğeri soluk.
 */
export function AppNav() {
  const pathname = usePathname();
  const yonetici = useIsAdmin();

  return (
    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em]">
      <span className="text-muted-foreground">ChronoFlow</span>
      <span className="text-muted-foreground/30" aria-hidden>
        /
      </span>
      <nav className="flex items-center gap-3">
        {[...SEKMELER, ...(yonetici ? [YONETIM] : [])].map((sekme) => {
          const aktif = pathname === sekme.href;
          return (
            <Link
              key={sekme.href}
              href={sekme.href}
              aria-current={aktif ? 'page' : undefined}
              className={cn(
                'rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                aktif
                  ? 'text-foreground'
                  : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
            >
              {sekme.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
