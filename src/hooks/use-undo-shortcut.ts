'use client';

import { useEffect } from 'react';

import { useTaskStore } from '@/store/useTaskStore';

/**
 * Ctrl+Z (macOS'ta ⌘Z) son değişikliği geri alır.
 *
 * Metin alanlarında devreye girmiyoruz: orada kullanıcının beklediği şey
 * yazdığı harfin geri alınması, planının değil.
 */
export function useUndoShortcut() {
  const undo = useTaskStore((s) => s.undo);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isUndo =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'z';
      if (!isUndo) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      undo();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo]);
}
