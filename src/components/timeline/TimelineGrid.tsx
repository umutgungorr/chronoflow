'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { isToday } from 'date-fns';

import { GridLines } from '@/components/timeline/GridLines';
import { NowIndicator } from '@/components/timeline/NowIndicator';
import { SlotInteractionLayer } from '@/components/timeline/SlotInteractionLayer';
import { TaskBlock } from '@/components/timeline/TaskBlock';
import { TimelineRuler } from '@/components/timeline/TimelineRuler';
import { useCurrentMinute } from '@/hooks/use-current-minute';
import { GUTTER_WIDTH_PX, PX_PER_MINUTE, TIMELINE_HEIGHT_PX } from '@/lib/constants';
import {
  applyDragPreview,
  layoutOverlaps,
  type DragMode,
  type DragPreview,
} from '@/lib/layout';
import { getAvailableDuration } from '@/lib/scheduler';
import { formatTime, fromDayMinutes, minutesToY, snapMinutes } from '@/lib/time';
import { useTaskStore, useTasksForSelectedDay } from '@/store/useTaskStore';

/** Sayfa açıldığında "şimdi" çizgisinin üstünde bırakılacak boşluk. */
const SCROLL_LEAD_PX = 140;

/** dnd-kit id'si `görevId|mod` biçiminde; ikisini ayrıştırır. */
function readDragData(data: unknown): { taskId: string; mode: DragMode } | null {
  if (!data || typeof data !== 'object') return null;
  const { taskId, mode } = data as { taskId?: string; mode?: DragMode };
  return taskId && mode ? { taskId, mode } : null;
}

export function TimelineGrid() {
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Sürükleme bitince tarayıcının gönderdiği artık click'i yutmak için. */
  const swallowNextClick = useRef(false);

  const tasks = useTasksForSelectedDay();
  const day = useTaskStore((s) => s.selectedDate);
  const allTasks = useTaskStore((s) => s.tasks);
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
  const selectTask = useTaskStore((s) => s.selectTask);
  const openCreateEditor = useTaskStore((s) => s.openCreateEditor);
  const openEditEditor = useTaskStore((s) => s.openEditEditor);
  const moveTask = useTaskStore((s) => s.moveTask);
  const resizeTask = useTaskStore((s) => s.resizeTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const [preview, setPreview] = useState<DragPreview | null>(null);
  const nowMinute = useCurrentMinute();
  const showNow = nowMinute !== null && isToday(day);

  /*
   * ── SÜRÜKLEME MATEMATİĞİ ────────────────────────────────────────────────
   *
   * dnd-kit bize yalnızca bir şey verir: `event.delta` — sürüklemenin
   * başladığı noktadan itibaren imlecin kat ettiği PİKSEL farkı.
   * Bunu dakikaya çevirmek tek satır:
   *
   *     dakika = delta.y / PX_PER_MINUTE        (PX_PER_MINUTE = 20/15)
   *
   * Ardından 15'e yuvarlıyoruz. Yani mıknatıslanma, bloğun mutlak
   * konumuna değil TAŞINAN MESAFEYE uygulanıyor. Neden? Çünkü blokların
   * başlangıçları zaten hep 15'in katı; 15'in katı bir mesafe eklemek
   * sonucu da 15'in katı yapar. Böylece 09:00 → 09:15 → 09:30 diye
   * temiz adımlarla ilerler, ara değerlere hiç uğramaz.
   *
   * Elde edilen delta, `applyDragPreview()` ile göreve uygulanır — aynı
   * fonksiyonu TaskBlock canlı önizleme çizerken de çağırır. Tek kaynak.
   */
  const toDeltaMinutes = (deltaY: number) => snapMinutes(deltaY / PX_PER_MINUTE);

  const sensors = useSensors(
    // 4px'lik eşik: tıklama (seçme) ile sürükleme birbirine karışmasın.
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // Dokunmatikte basılı tutma eşiği: sayfa kaydırma serbest kalsın.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  /**
   * Sürükleme ve klavye aynı yolu kullanır: delta → yerleşim → store.
   *
   * Görevi render kapanışındaki `allTasks`'tan DEĞİL, store'un o anki
   * halinden okuyoruz: ok tuşuna arka arkaya basıldığında (tuş tekrarı)
   * aynı tick içinde birden çok commit gelir; kapanıştaki liste bayat
   * olduğu için hepsi aynı başlangıcı hesaplar ve yalnızca son adım işlerdi.
   */
  const commit = (taskId: string, mode: DragMode, deltaMinutes: number) => {
    const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
    if (!task) return;

    const { start, duration } = applyDragPreview(task, { taskId, mode, deltaMinutes });

    if (mode === 'move') moveTask(taskId, start);
    else if (mode === 'resize-end') resizeTask(taskId, 'end', start + duration);
    else resizeTask(taskId, 'start', start);
  };

  const handleDragStart = (event: DragStartEvent) => {
    swallowNextClick.current = false;
    const data = readDragData(event.active.data.current);
    if (data) setPreview({ ...data, deltaMinutes: 0 });
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const deltaMinutes = toDeltaMinutes(event.delta.y);
    // Yalnızca 15dk'lık eşik atlandığında state güncellenir; ara piksellerde
    // render yapılmaz. Sürükleme boyunca en fazla dilim sayısı kadar render.
    setPreview((current) =>
      current === null || current.deltaMinutes === deltaMinutes
        ? current
        : { ...current, deltaMinutes },
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const data = readDragData(event.active.data.current);
    setPreview(null);
    if (!data) return;

    const deltaMinutes = toDeltaMinutes(event.delta.y);
    if (deltaMinutes === 0) return;

    // Gerçek bir sürükleme oldu: tarayıcı bunun ardından bir click daha
    // gönderecek. Onu yutmazsak blok sürüklenip aynı anda seçilir.
    swallowNextClick.current = true;
    commit(data.taskId, data.mode, deltaMinutes);
  };

  const handleSelect = (id: string) => {
    if (swallowNextClick.current) {
      swallowNextClick.current = false;
      return;
    }
    selectTask(id === selectedTaskId ? null : id);
  };

  // Açılışta günün başına değil, "şimdi"ye kaydır: kullanıcı önce ilgilendiği
  // saati görür. Başka bir güne geçilince sabah 07:00 hizasına gider.
  //
  // Dikkat: ilk render'da `nowMinute` henüz null'dur (SSR güvenliği için).
  // Bu yüzden bugün görüntüleniyorsa saat bilinene kadar bekliyor, sonra
  // gün başına BİR KEZ konumlanıyoruz — aksi halde her dakika zıplardı.
  const positionedFor = useRef<string | null>(null);
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const today = isToday(day);
    if (today && nowMinute === null) return;

    const key = day.toDateString();
    if (positionedFor.current === key) return;
    positionedFor.current = key;

    const anchor = today && nowMinute !== null ? nowMinute : 7 * 60;
    node.scrollTop = Math.max(0, minutesToY(anchor) - SCROLL_LEAD_PX);
  }, [day, nowMinute]);

  // Çakışan bloklar yan yana dizilir (sabit görev zinciri kırınca oluşur).
  const laidOut = useMemo(() => layoutOverlaps(tasks), [tasks]);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-quiet relative flex-1 overflow-y-auto overscroll-contain rounded-xl border bg-canvas"
      style={{ ['--gutter-width' as string]: `${GUTTER_WIDTH_PX}px` }}
    >
      <div className="relative flex" style={{ height: TIMELINE_HEIGHT_PX }}>
        <TimelineRuler activeHour={showNow ? Math.floor(nowMinute / 60) : null} />

        {/* Tuval: tüm katmanlar buraya, aynı koordinat sistemine yığılır. */}
        <div className="relative flex-1 border-l">
          <GridLines />

          <SlotInteractionLayer
            day={day}
            disabled={preview !== null}
            getDuration={(start) => getAvailableDuration(allTasks, day, start, 60)}
            // Boş dilime tıklamak bloğu HEMEN oluşturmaz; saat/süre ön dolu
            // pencereyi açar. İptal edilirse ortada artık blok kalmaz.
            onCreate={(start) =>
              openCreateEditor(start, getAvailableDuration(allTasks, day, start, 60))
            }
          />

          {tasks.length === 0 && (
            <p
              className="pointer-events-none absolute inset-x-0 z-10 text-center text-sm text-muted-foreground"
              style={{ top: minutesToY(10 * 60) }}
            >
              Gün boş. Bir saate tıkla, ilk bloğunu koy.
            </p>
          )}

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setPreview(null)}
            accessibility={{
              announcements: {
                onDragStart: () => 'Blok taşınıyor.',
                onDragOver: () => undefined,
                onDragEnd: () => 'Blok bırakıldı.',
                onDragCancel: () => 'Taşıma iptal edildi.',
              },
            }}
          >
            {/* Blok katmanı: kenar boşluğunu burada verip blokların yüzde
                hesabını (yan yana dizilim) temiz tutuyoruz.

                mousedown = yeni bir etkileşimin başlangıcı. Sürüklemeden artakalan
                "tıklamayı yut" bayrağını burada indiriyoruz; aksi halde kullanıcı
                sürükledikten sonra başka yere tıklarsa bayrak silahlı kalır ve
                sıradaki meşru tıklamayı yerdi. Sürüklemenin kendi artık tıklaması
                öncesinde yeni bir mousedown olmadığı için o hâlâ yutuluyor. */}
            <div
              className="pointer-events-none absolute inset-y-0 left-2 right-2 z-10"
              onMouseDownCapture={() => {
                swallowNextClick.current = false;
              }}
            >
              {laidOut.map(({ task, lane, laneCount }) => (
                <TaskBlock
                  key={task.id}
                  task={task}
                  day={day}
                  lane={lane}
                  laneCount={laneCount}
                  isSelected={task.id === selectedTaskId}
                  preview={preview?.taskId === task.id ? preview : null}
                  onSelect={handleSelect}
                  onOpen={openEditEditor}
                  onNudge={commit}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </DndContext>

          {showNow && (
            <NowIndicator
              minute={nowMinute}
              label={formatTime(fromDayMinutes(day, nowMinute))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
