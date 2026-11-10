'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { tasksToNotify } from '@/lib/focus';
import { formatTime } from '@/lib/time';
import { useTaskStore } from '@/store/useTaskStore';

const PREF_KEY = 'chronoflow-notifications';

export type NotificationState = 'unsupported' | 'denied' | 'off' | 'on';

function readState(): NotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.permission === 'granted' && localStorage.getItem(PREF_KEY) === '1'
    ? 'on'
    : 'off';
}

type NotificationStore = {
  state: NotificationState;
  init: () => void;
  toggle: () => Promise<void>;
};

/**
 * Tek kaynak: ayarlar çekmecesindeki düğme ile arka plandaki denetleyici
 * aynı durumu paylaşsın diye store'da tutuluyor.
 */
export const useNotificationStore = create<NotificationStore>((set, get) => ({
  state: 'off',
  init: () => set({ state: readState() }),
  toggle: async () => {
    const { state } = get();
    if (state === 'unsupported' || state === 'denied') return;

    if (state === 'on') {
      localStorage.setItem(PREF_KEY, '0');
      set({ state: 'off' });
      return;
    }

    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(PREF_KEY, '1');
      set({ state: 'on' });
    } else {
      set({ state: permission === 'denied' ? 'denied' : 'off' });
    }
  },
}));

/** Düğme için: durum + aç/kapa. */
export function useBlockNotifications() {
  const state = useNotificationStore((s) => s.state);
  const toggle = useNotificationStore((s) => s.toggle);
  return { state, toggle };
}

/**
 * Blok başlamadan 5 dk önce tarayıcı bildirimi — plan sayfasında bir kez
 * bağlanır.
 *
 * Gerçek "arka plan push" değil: sekme/PWA açıkken (arka planda da olsa)
 * 30 sn'de bir kontrol eder. Uygulama tamamen kapalıyken bildirim gelmez;
 * bunun için sunucu push altyapısı gerekir.
 */
export function useNotificationRunner() {
  const state = useNotificationStore((s) => s.state);
  const init = useNotificationStore((s) => s.init);
  const notified = useRef(new Set<string>());

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (state !== 'on') return;

    const check = () => {
      const tasks = useTaskStore.getState().tasks;
      for (const task of tasksToNotify(tasks, new Date(), notified.current)) {
        notified.current.add(task.id);
        new Notification(task.title, {
          body: `${formatTime(task.startTime)} · birazdan başlıyor`,
          tag: task.id,
        });
      }
    };

    check();
    const timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, [state]);
}
