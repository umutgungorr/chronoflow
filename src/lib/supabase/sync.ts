'use client';

import { create } from 'zustand';

import { supabase, type TaskRow } from '@/lib/supabase/client';
import { rowToTask, taskToRow } from '@/lib/supabase/mappers';
import { useTaskStore } from '@/store/useTaskStore';
import type { Task } from '@/types';

/**
 * Senkron motoru — çevrimdışı öncelikli (offline-first).
 *
 * Kural: ARAYÜZ AĞI BEKLEMEZ. Kullanıcı bir bloğu sürüklediğinde işlem
 * anında yerelde biter; sunucuya gönderim arkada olur. Ağ yoksa iş kuyrukta
 * bekler ve bağlantı gelince boşalır.
 *
 * ── Değişiklikler nasıl yakalanıyor? ────────────────────────────────────────
 * Store'daki her aksiyona tek tek "sunucuya da yaz" satırı eklemedik. Bunun
 * yerine `tasks` dizisini izleyip ÖNCEKİ HALİYLE FARKINI alıyoruz. Böylece
 * tampon algoritmasının sildiği bloklar, AI'ın eklediği beş blok, sürükleme
 * sonrası kayan üç blok — hepsi tek bir yerden, aynı şekilde yakalanıyor.
 * Yeni bir aksiyon eklendiğinde senkron kodu değişmiyor.
 */

/* -------------------------------------------------------------------------- */
/*  Durum (arayüzdeki göstergeyi besler)                                      */
/* -------------------------------------------------------------------------- */

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

type SyncState = {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
};

export const useSyncStore = create<SyncState>(() => ({
  status: 'off',
  pending: 0,
  lastSyncedAt: null,
  errorMessage: null,
}));

const setSync = (patch: Partial<SyncState>) => useSyncStore.setState(patch);

/* -------------------------------------------------------------------------- */
/*  Kuyruk (outbox)                                                           */
/* -------------------------------------------------------------------------- */

type PendingOp = { id: string; type: 'upsert' | 'delete' };

const OUTBOX_KEY = 'chronoflow-outbox';

/** Görev başına tek iş tutulur: son niyet önceki niyeti geçersiz kılar. */
let outbox = new Map<string, PendingOp>();

/** id → içerik imzası. Neyin gerçekten değiştiğini buradan anlıyoruz. */
let known = new Map<string, string>();

let userId: string | null = null;
let unsubscribeTasks: (() => void) | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;
/** Sunucudan gelen veriyi yazarken kendi değişikliğimizi kuyruğa almayalım. */
let applyingRemote = false;

function signature(task: Task): string {
  return [
    task.title,
    task.description ?? '',
    task.startTime.getTime(),
    task.endTime.getTime(),
    task.category,
    task.isCompleted ? 1 : 0,
    task.isFixed ? 1 : 0,
  ].join('|');
}

function loadOutbox() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    const parsed: PendingOp[] = raw ? JSON.parse(raw) : [];
    outbox = new Map(parsed.map((op) => [op.id, op]));
  } catch {
    outbox = new Map();
  }
}

function saveOutbox() {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify([...outbox.values()]));
  } catch {
    // Kota dolduysa yapacak bir şey yok; kuyruk bellekte yaşamaya devam eder.
  }
  setSync({ pending: outbox.size });
}

/* -------------------------------------------------------------------------- */
/*  Değişiklik yakalama                                                       */
/* -------------------------------------------------------------------------- */

function snapshot(tasks: Task[]): Map<string, string> {
  return new Map(tasks.map((task) => [task.id, signature(task)]));
}

function onTasksChanged(tasks: Task[]) {
  const current = snapshot(tasks);

  if (applyingRemote) {
    // Sunucudan gelen veri: bilinen hali güncelle, kuyruğa hiçbir şey ekleme.
    known = current;
    return;
  }

  for (const [id, sig] of current) {
    if (known.get(id) !== sig) outbox.set(id, { id, type: 'upsert' });
  }
  for (const id of known.keys()) {
    if (!current.has(id)) outbox.set(id, { id, type: 'delete' });
  }

  known = current;
  saveOutbox();
  scheduleFlush();
}

/** Art arda gelen değişiklikleri (ör. sürükleme sonrası reflow) tek istekte topla. */
function scheduleFlush(delay = 400) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, delay);
}

/* -------------------------------------------------------------------------- */
/*  Gönderme                                                                  */
/* -------------------------------------------------------------------------- */

async function flush(): Promise<void> {
  if (!supabase || !userId || flushing) return;

  // Gönderilecek bir şey yoksa gösterge "eşitleniyor"da asılı kalmasın.
  if (outbox.size === 0) {
    setSync({ status: 'idle' });
    return;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSync({ status: 'offline' });
    return;
  }

  flushing = true;
  setSync({ status: 'syncing', errorMessage: null });

  // Bu turda gönderilecekleri kopyala: gönderim sürerken kullanıcı yeni
  // değişiklik yaparsa onlar kuyrukta kalsın, yanlışlıkla silinmesin.
  const batch = [...outbox.values()];
  const tasks = useTaskStore.getState().tasks;
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const rows = batch
    .filter((op) => op.type === 'upsert')
    .map((op) => byId.get(op.id))
    .filter((task): task is Task => task !== undefined)
    .map((task) => taskToRow(task, userId!));

  const deletedIds = batch.filter((op) => op.type === 'delete').map((op) => op.id);

  try {
    if (rows.length > 0) {
      const { error } = await supabase.from('tasks').upsert(rows);
      if (error) throw error;
    }

    if (deletedIds.length > 0) {
      // Gerçek silme değil, mezar taşı: diğer cihaz da silindiğini öğrensin.
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', deletedIds)
        .eq('user_id', userId);
      if (error) throw error;
    }

    for (const op of batch) {
      // Bu sırada aynı görev tekrar değiştiyse kuyrukta kalmalı.
      if (outbox.get(op.id)?.type === op.type) outbox.delete(op.id);
    }
    saveOutbox();
    setSync({ status: 'idle', lastSyncedAt: new Date(), errorMessage: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    setSync({ status: 'error', errorMessage: message });
    // Kuyruk duruyor; bir sonraki tetikte yeniden denenecek.
  } finally {
    flushing = false;
  }
}

/* -------------------------------------------------------------------------- */
/*  Çekme                                                                     */
/* -------------------------------------------------------------------------- */

async function fetchRows(): Promise<TaskRow[] | null> {
  if (!supabase || !userId) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSync({ status: 'offline' });
    return null;
  }

  const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId);
  if (error) {
    setSync({ status: 'error', errorMessage: error.message });
    return null;
  }
  return data ?? [];
}

async function pull(): Promise<void> {
  const rows = await fetchRows();
  if (rows === null) return;

  applyRemote(rows);
  setSync({
    status: outbox.size > 0 ? 'syncing' : 'idle',
    lastSyncedAt: new Date(),
    errorMessage: null,
  });
}

/**
 * Girişten sonraki İLK eşitleme — buradaki karar önemli.
 *
 * Sorun: uygulama her açılışta örnek planla (mock) doluyor. Telefondan ilk
 * kez girdiğinde cihazda henüz yerel veri yoktur, ekranda örnek plan durur.
 * "Yereldeki her şeyi hesaba gönder" deseydik telefon, bilgisayarda kurduğun
 * gerçek planın üstüne 11 sahte blok yazardı.
 *
 * Kural şu:
 *   • Hesap BOŞSA  → yerelde ne varsa gönder. (İlk cihaz; elindeki tek veri o.)
 *   • Hesap DOLUYSA → yalnızca gerçekten yerel üretilmiş blokları gönder;
 *                     artakalan örnek plan blokları (mock-*) sessizce silinir.
 */
async function initialSync(): Promise<void> {
  const rows = await fetchRows();
  if (rows === null) {
    // Ağ yok: kuyruk duruyor, bağlantı gelince tekrar denenecek.
    scheduleFlush(3000);
    return;
  }

  applyRemote(rows);

  const accountIsEmpty = rows.length === 0;
  const serverIds = new Set(rows.map((row) => row.id));
  const local = useTaskStore.getState().tasks;

  const seedLeftovers = new Set<string>();
  for (const task of local) {
    if (serverIds.has(task.id)) continue;
    if (accountIsEmpty || !task.id.startsWith('mock-')) {
      outbox.set(task.id, { id: task.id, type: 'upsert' });
    } else {
      seedLeftovers.add(task.id);
    }
  }

  if (seedLeftovers.size > 0) {
    applyingRemote = true;
    useTaskStore.getState().replaceTasks(local.filter((t) => !seedLeftovers.has(t.id)));
    applyingRemote = false;
  }

  saveOutbox();
  await flush();
  setSync({
    status: outbox.size > 0 ? 'syncing' : 'idle',
    lastSyncedAt: new Date(),
  });
}

/**
 * Sunucudan geleni yerelle birleştirir.
 *
 * Çakışma kuralı: sunucu kazanır — AMA o görev için bekleyen yerel bir iş
 * varsa yerel kazanır. Çünkü bekleyen iş, kullanıcının sunucunun henüz
 * duymadığı en son niyetidir; birazdan zaten gönderilecek.
 */
function applyRemote(rows: TaskRow[]) {
  const local = useTaskStore.getState().tasks;
  const merged = new Map(local.map((task) => [task.id, task]));

  for (const row of rows) {
    if (outbox.has(row.id)) continue;
    if (row.deleted_at) merged.delete(row.id);
    else merged.set(row.id, rowToTask(row));
  }

  applyingRemote = true;
  useTaskStore.getState().replaceTasks([...merged.values()]);
  applyingRemote = false;
}

/* -------------------------------------------------------------------------- */
/*  Yaşam döngüsü                                                             */
/* -------------------------------------------------------------------------- */

function handleOnline() {
  setSync({ status: 'syncing' });
  void flush().then(() => pull());
}

function handleOffline() {
  setSync({ status: 'offline' });
}

function handleFocus() {
  // Telefonu cebinden çıkarıp uygulamayı açtığın an taze veri gelsin.
  void pull().then(() => flush());
}

export function startSync(id: string) {
  if (!supabase) return;
  stopSync();

  userId = id;
  loadOutbox();
  known = snapshot(useTaskStore.getState().tasks);

  unsubscribeTasks = useTaskStore.subscribe((state, previous) => {
    if (state.tasks !== previous.tasks) onTasksChanged(state.tasks);
  });

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('focus', handleFocus);
  pullTimer = setInterval(() => void pull(), 60_000);

  setSync({ status: 'syncing', pending: outbox.size });
  void initialSync();
}

export function stopSync() {
  unsubscribeTasks?.();
  unsubscribeTasks = null;
  if (flushTimer) clearTimeout(flushTimer);
  if (pullTimer) clearInterval(pullTimer);
  flushTimer = null;
  pullTimer = null;

  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('focus', handleFocus);
  }

  userId = null;
  known = new Map();
  setSync({ status: 'off', pending: 0, errorMessage: null });
}

/** Çıkış yapmadan önce elde kalanı göndermeye çalış. */
export async function flushBeforeSignOut(): Promise<void> {
  await flush();
  outbox = new Map();
  saveOutbox();
}

/** Kullanıcının elle tetiklediği yenileme. */
export async function syncNow(): Promise<void> {
  await flush();
  await pull();
}
