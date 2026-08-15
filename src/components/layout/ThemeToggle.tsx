'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  setStoredTheme,
  subscribeToTheme,
} from '@/lib/theme';

/**
 * Açık/koyu tema anahtarı.
 *
 * Temayı React state'inde tutmuyoruz: ilk değeri sayfa boyanmadan önce
 * satır içi betik <html> sınıfına yazıyor. Buradan yalnızca o sınıfı
 * okuyup yazıyoruz — tek kaynak DOM.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground"
      onClick={() => setStoredTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={isDark ? 'Açık tema' : 'Koyu tema'}
    >
      {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </Button>
  );
}
