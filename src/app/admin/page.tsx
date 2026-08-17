'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RefreshCw, ShieldAlert } from 'lucide-react';

import { AuthGate } from '@/components/auth/AuthGate';
import { AppNav } from '@/components/layout/AppNav';
import { Button } from '@/components/ui/button';
import { describeUserAgent } from '@/lib/supabase/admin';
import { useAdminDataStore } from '@/store/useAdminDataStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminPage() {
  return (
    <AuthGate>
      <Admin />
    </AuthGate>
  );
}

function zaman(iso: string | null): string {
  if (!iso) return '—';
  return format(new Date(iso), 'd MMM HH:mm', { locale: tr });
}

function Admin() {
  const userId = useAuthStore((s) => s.userId);
  const yetkili = useAdminDataStore((s) => s.yetkili);
  const users = useAdminDataStore((s) => s.users);
  const visits = useAdminDataStore((s) => s.visits);
  const yukleniyor = useAdminDataStore((s) => s.yukleniyor);
  const load = useAdminDataStore((s) => s.load);

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  if (yetkili === false) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldAlert className="size-6 text-muted-foreground/60" aria-hidden />
        <p className="text-sm text-muted-foreground">Bu sayfaya erişimin yok.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-10 pt-5 sm:px-6">
      <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <AppNav />
          <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold leading-none tracking-[-0.03em]">
            Yönetim
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {users.length} kullanıcı · son {visits.length} ziyaret
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs"
          onClick={() => userId && void load(userId)}
          disabled={yukleniyor}
        >
          <RefreshCw className={`size-3.5 ${yukleniyor ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </header>

      <section className="space-y-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Kullanıcılar
        </h2>
        <div className="overflow-x-auto rounded-xl border bg-canvas">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">E-posta</th>
                <th className="px-3 py-2 font-normal">Kayıt</th>
                <th className="px-3 py-2 font-normal">Son giriş</th>
                <th className="px-3 py-2 text-right font-normal">Blok</th>
                <th className="px-3 py-2 text-right font-normal">Hedef</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId} className="border-b last:border-0">
                  <td className="truncate px-3 py-2">{u.email ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {zaman(u.createdAt)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {zaman(u.lastSignInAt)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{u.taskCount}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{u.goalCount}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    {yukleniyor ? 'Yükleniyor…' : 'Kayıt yok.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Ziyaretler
        </h2>
        <div className="overflow-x-auto rounded-xl border bg-canvas">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Zaman</th>
                <th className="px-3 py-2 font-normal">Kim</th>
                <th className="px-3 py-2 font-normal">IP</th>
                <th className="px-3 py-2 font-normal">Cihaz</th>
                <th className="px-3 py-2 font-normal">Sayfa</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => {
                const kullanici = users.find((u) => u.userId === v.userId);
                return (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                      {zaman(v.occurredAt)}
                    </td>
                    <td className="truncate px-3 py-2">
                      {kullanici?.email ?? (
                        <span className="text-muted-foreground">ziyaretçi</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      {v.ip ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {describeUserAgent(v.userAgent)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {v.path ?? '—'}
                    </td>
                  </tr>
                );
              })}
              {visits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    {yukleniyor ? 'Yükleniyor…' : 'Henüz ziyaret kaydı yok.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
