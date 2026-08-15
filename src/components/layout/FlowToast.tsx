'use client';

import { useEffect } from 'react';
import { Info, TriangleAlert, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';

/**
 * Tampon algoritmasının sesi.
 *
 * Bir blok taşındığında/uzatıldığında zincirleme ne olduğunu söyler:
 * "1 tampon blok darbeyi emdi" ya da sabit görev çakışması uyarısı.
 * Kullanıcı planının neden değiştiğini görmezse sisteme güvenmez.
 */
export function FlowToast() {
  const feedback = useTaskStore((s) => s.feedback);
  const clearFeedback = useTaskStore((s) => s.clearFeedback);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(clearFeedback, 5000);
    return () => clearTimeout(timer);
  }, [feedback, clearFeedback]);

  if (!feedback) return null;

  const isWarning = feedback.tone === 'warning';
  const Icon = isWarning ? TriangleAlert : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-rise pointer-events-auto fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[min(32rem,90vw)] items-start gap-2.5 rounded-lg border bg-popover px-3.5 py-2.5 shadow-lg"
    >
      <Icon
        className={cn(
          'mt-px size-4 shrink-0',
          isWarning ? 'text-amber-500' : 'text-muted-foreground',
        )}
      />
      <p className="text-[13px] leading-snug">{feedback.message}</p>
      <button
        onClick={clearFeedback}
        aria-label="Kapat"
        className="-mr-1 ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
