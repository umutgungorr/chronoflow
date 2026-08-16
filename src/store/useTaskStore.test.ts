import { beforeEach, describe, expect, it } from 'vitest';

import { GUN, gorev, harita } from '@/lib/test-utils';
import { useTaskStore } from '@/store/useTaskStore';

/** Her testten önce store'u bilinen bir başlangıca çeker. */
function kur(tasks = [gorev('a', '09:00', 60), gorev('b', '14:00', 60)]) {
  useTaskStore.setState({
    tasks,
    selectedDate: GUN,
    selectedTaskId: null,
    editor: null,
    feedback: null,
    history: [],
  });
}

const gorevler = () => useTaskStore.getState().tasks;
const gecmis = () => useTaskStore.getState().history;

beforeEach(() => kur());

describe('geri alma', () => {
  it('geçmiş boşken hiçbir şey yapmaz', () => {
    const oncesi = gorevler();
    useTaskStore.getState().undo();
    expect(gorevler()).toBe(oncesi);
  });

  it('silmeyi geri alır', () => {
    useTaskStore.getState().deleteTask('a');
    expect(gorevler().map((t) => t.id)).toEqual(['b']);

    useTaskStore.getState().undo();
    expect(gorevler().map((t) => t.id)).toEqual(['a', 'b']);
    expect(gecmis()).toHaveLength(0);
  });

  it('taşımayı geri alır — saatler eski haline döner', () => {
    useTaskStore.getState().moveTask('a', 11 * 60);
    expect(harita(gorevler())).toMatchObject({ a: '11:00-12:00' });

    useTaskStore.getState().undo();
    expect(harita(gorevler())).toMatchObject({ a: '09:00-10:00' });
  });

  it('tampon algoritmasının sildiği bloğu da geri getirir', () => {
    kur([
      gorev('is', '09:00', 60),
      gorev('tampon', '10:00', 30, { category: 'BUFFER' }),
      gorev('sonraki', '10:30', 60),
    ]);

    // 60dk uzatma tamponu tamamen yer.
    useTaskStore.getState().resizeTask('is', 'end', 11 * 60);
    expect(gorevler().map((t) => t.id)).not.toContain('tampon');

    useTaskStore.getState().undo();
    expect(gorevler().map((t) => t.id)).toContain('tampon');
    expect(harita(gorevler())).toMatchObject({
      is: '09:00-10:00',
      tampon: '10:00-10:30',
      sonraki: '10:30-11:30',
    });
  });

  it('günü temizlemeyi geri alır', () => {
    useTaskStore.getState().clearDay();
    expect(gorevler()).toHaveLength(0);

    useTaskStore.getState().undo();
    expect(gorevler()).toHaveLength(2);
  });

  it('AI dağıtımını tek adımda geri alır', () => {
    kur([]);
    useTaskStore.getState().applyMagicSchedule('2 saat kod, 1 saat spor', {
      withBuffers: true,
    });
    expect(gorevler().length).toBeGreaterThan(2);

    useTaskStore.getState().undo();
    expect(gorevler()).toHaveLength(0);
    expect(gecmis()).toHaveLength(0);
  });

  it('birden çok adımı sırayla geri alır', () => {
    useTaskStore.getState().deleteTask('a');
    useTaskStore.getState().deleteTask('b');
    expect(gorevler()).toHaveLength(0);

    useTaskStore.getState().undo();
    expect(gorevler().map((t) => t.id)).toEqual(['b']);

    useTaskStore.getState().undo();
    expect(gorevler().map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('geri alınca ne yapıldığını söyler', () => {
    useTaskStore.getState().deleteTask('a');
    useTaskStore.getState().undo();
    expect(useTaskStore.getState().feedback?.message).toBe('Geri alındı: blok silindi');
  });

  it('geri alınca açık pencere ve seçim temizlenir', () => {
    useTaskStore.getState().selectTask('a');
    useTaskStore.getState().openEditEditor('a');
    useTaskStore.getState().deleteTask('b');

    useTaskStore.getState().undo();
    expect(useTaskStore.getState().selectedTaskId).toBeNull();
    expect(useTaskStore.getState().editor).toBeNull();
  });

  it('senkronun yazdığı değişiklik geçmişe girmez', () => {
    // Uzaktaki bir düzenlemeyi "geri almak" anlamsız olurdu.
    useTaskStore.getState().replaceTasks([gorev('uzak', '08:00', 30)]);
    expect(gecmis()).toHaveLength(0);
  });

  it('gün değiştirmek geçmişe girmez', () => {
    useTaskStore.getState().goToNextDay();
    expect(gecmis()).toHaveLength(0);
  });

  it('geçmiş sınırsız büyümez', () => {
    for (let i = 0; i < 40; i++) useTaskStore.getState().toggleComplete('a');
    expect(gecmis().length).toBeLessThanOrEqual(30);
  });
});
