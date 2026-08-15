'use client';

/**
 * Tema tercihi.
 *
 * Üç durum yerine iki durum tutuyoruz: kullanıcı bir seçim yapana kadar
 * sistem tercihi geçerli, ilk tıklamadan sonra seçimi hatırlanıyor.
 * Kayıtlı değer yoksa `null` döner — "henüz karar vermedi" demek.
 */

export type Theme = 'light' | 'dark';

export const THEME_KEY = 'chronoflow-theme';

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Sınıfı <html> üzerine uygular; tokenlar globals.css'te `.dark` altında. */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  emit();
}

export function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Depolama kapalıysa tema yalnızca bu oturumda geçerli olur.
  }
  applyTheme(theme);
}

/* -------------------------------------------------------------------------- */
/*  React köprüsü                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Tema React state'inde değil, <html> sınıfında yaşıyor — çünkü ilk değeri
 * sayfa boyanmadan önce satır içi betik yazıyor. Bu yüzden onu bir "dış
 * sistem" gibi okuyoruz; `useSyncExternalStore` tam olarak bunun için var.
 */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToTheme(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  // Kullanıcı seçim yapmadıysa sistem temasını izlemeye devam ederiz.
  const onSystemChange = () => {
    if (getStoredTheme() === null) applyTheme(media.matches ? 'dark' : 'light');
  };
  media.addEventListener('change', onSystemChange);

  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', onSystemChange);
  };
}

export function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Sunucuda DOM yok; ilk render açık temayla yapılır, istemci hemen düzeltir. */
export function getThemeServerSnapshot(): Theme {
  return 'light';
}

/**
 * Sayfa boyanmadan ÖNCE çalışması gereken betik.
 *
 * layout.tsx içine satır içi gömülür. Amacı "flash": React yüklenene kadar
 * geçen sürede açık tema görünüp sonra karanlığa atlamasını engellemek.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark')}}catch(e){}})()`;
