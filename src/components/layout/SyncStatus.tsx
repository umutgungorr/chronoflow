'use client';

import { useEffect } from 'react';
import { Check, CloudOff, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { flushBeforeSignOut, startSync, stopSync, syncNow, useSyncStore } from '@/lib/supabase/sync';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';

/**
 * Senkron motorunu oturuma bağlar.
 *
 * Neden ayrı bir bileşen? Motor başlarken yereldeki her görevi "gönderilecek"
 * diye işaretliyor. Bu yüzden localStorage okunmadan ÖNCE başlarsa mock veriyi
 * hesaba yazardı. Bu bileşen yalnızca hydration bittikten sonra render edilir.
 */
export function SyncBridge() {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    if (status !== 'signed-in' || !userId) return;
    startSync(userId);
    return () => stopSync();
  }, [status, userId]);

  return null;
}

const LABELS: Record<string, string> = {
  idle: 'Eşitlendi',
  syncing: 'Eşitleniyor',
  offline: 'Çevrimdışı',
  error: 'Eşitlenemedi',
};

/** Alt şeritteki sessiz durum göstergesi + çıkış. */
export function SyncStatus() {
  const authStatus = useAuthStore((s) => s.status);
  const email = useAuthStore((s) => s.email);
  const signOut = useAuthStore((s) => s.signOut);
  const replaceTasks = useTaskStore((s) => s.replaceTasks);

  const status = useSyncStore((s) => s.status);
  const pending = useSyncStore((s) => s.pending);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const errorMessage = useSyncStore((s) => s.errorMessage);

  if (authStatus !== 'signed-in') return null;

  const handleSignOut = async () => {
    // Elde kalan varsa göndermeyi dene; sonra bu cihazdaki kopyayı temizle.
    await flushBeforeSignOut();
    await signOut();
    replaceTasks([]);
  };

  const Icon =
    status === 'syncing'
      ? Loader2
      : status === 'offline'
        ? CloudOff
        : status === 'error'
          ? TriangleAlert
          : Check;

  const detail =
    pending > 0
      ? `${pending} değişiklik bekliyor`
      : lastSyncedAt
        ? formatTime(lastSyncedAt)
        : null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void syncNow()}
        title={errorMessage ?? 'Şimdi eşitle'}
        className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon
          className={cn(
            'size-3',
            status === 'syncing' && 'animate-spin',
            status === 'error' && 'text-amber-500',
          )}
        />
        <span>{LABELS[status] ?? 'Yerel'}</span>
        {detail && <span className="font-mono opacity-70">{detail}</span>}
        <RefreshCw className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-[11px] text-muted-foreground"
        onClick={() => void handleSignOut()}
        title={email ?? undefined}
      >
        Çıkış
      </Button>
    </div>
  );
}
