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
    dayTitles: {},
    lastKnownToday: '2026-08-15',
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

  it('gün adı değişikliğini de geri alır', () => {
    useTaskStore.getState().setDayTitle(GUN, 'Yoğun gün');
    expect(useTaskStore.getState().dayTitles['2026-08-15']).toBe('Yoğun gün');

    useTaskStore.getState().undo();
    expect(useTaskStore.getState().dayTitles['2026-08-15']).toBeUndefined();
  });
});

describe('gün adı', () => {
  const adlar = () => useTaskStore.getState().dayTitles;

  it('yerel güne göre anahtarlanır', () => {
    useTaskStore.getState().setDayTitle(GUN, 'Sınav');
    expect(adlar()).toEqual({ '2026-08-15': 'Sınav' });
  });

  it('gece yarısına yakın saatlerde gün kaymaz', () => {
    // toISOString() kullanılsaydı UTC+3'te 23:30 bir sonraki güne yazardı.
    useTaskStore.getState().setDayTitle(new Date(2026, 7, 15, 23, 30), 'Geç');
    expect(Object.keys(adlar())).toEqual(['2026-08-15']);
  });

  it('baştaki ve sondaki boşlukları atar', () => {
    useTaskStore.getState().setDayTitle(GUN, '  Yoğun gün  ');
    expect(adlar()['2026-08-15']).toBe('Yoğun gün');
  });

  it('boş metin adı siler', () => {
    useTaskStore.getState().setDayTitle(GUN, 'Bir şey');
    useTaskStore.getState().setDayTitle(GUN, '   ');
    expect(adlar()['2026-08-15']).toBeUndefined();
  });

  it('aynı ad tekrar yazılırsa geçmişi kirletmez', () => {
    useTaskStore.getState().setDayTitle(GUN, 'Aynı');
    const oncekiUzunluk = gecmis().length;
    useTaskStore.getState().setDayTitle(GUN, 'Aynı');
    expect(gecmis().length).toBe(oncekiUzunluk);
  });

  it('günler birbirini ezmez', () => {
    useTaskStore.getState().setDayTitle(GUN, 'Cumartesi');
    useTaskStore.getState().setDayTitle(new Date(2026, 7, 16), 'Pazar');
    expect(adlar()).toEqual({ '2026-08-15': 'Cumartesi', '2026-08-16': 'Pazar' });
  });

  it('senkronun yazdığı adlar geçmişe girmez', () => {
    useTaskStore.getState().replaceDayTitles({ '2026-08-20': 'Uzaktan' });
    expect(gecmis()).toHaveLength(0);
  });
});

describe('gün devri', () => {
  const gun = () => useTaskStore.getState().selectedDate;
  const bilinen = () => useTaskStore.getState().lastKnownToday;

  it('aynı gün içinde hiçbir şey yapmaz', () => {
    useTaskStore.getState().setSelectedDate(new Date(2026, 7, 20));
    useTaskStore.getState().rolloverToToday(new Date(2026, 7, 15, 23, 0));
    expect(gun().getDate()).toBe(20);
  });

  it('gece yarısı geçince eski "bugün"den yeni güne taşır', () => {
    // Kullanıcı 15'ine bakıyordu; saat 16'sına döndü.
    useTaskStore.getState().setSelectedDate(new Date(2026, 7, 15));
    useTaskStore.getState().rolloverToToday(new Date(2026, 7, 16, 0, 1));

    expect(gun().getDate()).toBe(16);
    expect(bilinen()).toBe('2026-08-16');
  });

  it('bilerek gidilen güne dokunmaz, ama günü öğrenir', () => {
    // Kullanıcı ileri bir günü planlıyordu; gece yarısı onu kaçırmasın.
    useTaskStore.getState().setSelectedDate(new Date(2026, 7, 25));
    useTaskStore.getState().rolloverToToday(new Date(2026, 7, 16, 0, 1));

    expect(gun().getDate()).toBe(25);
    expect(bilinen()).toBe('2026-08-16');
  });

  it('geçmiş bir güne bakarken de yerinden oynatmaz', () => {
    useTaskStore.getState().setSelectedDate(new Date(2026, 7, 10));
    useTaskStore.getState().rolloverToToday(new Date(2026, 7, 16, 0, 1));
    expect(gun().getDate()).toBe(10);
  });

  it('birden çok gün atlansa da bugüne getirir', () => {
    // Uygulama telefonda uykuda kaldı, üç gün sonra açıldı.
    useTaskStore.getState().setSelectedDate(new Date(2026, 7, 15));
    useTaskStore.getState().rolloverToToday(new Date(2026, 7, 18, 9, 0));
    expect(gun().getDate()).toBe(18);
  });

  it('taşınan gün, günün başlangıcına ayarlanır', () => {
    useTaskStore.getState().setSelectedDate(new Date(2026, 7, 15));
    useTaskStore.getState().rolloverToToday(new Date(2026, 7, 16, 14, 37));
    expect(gun().getHours()).toBe(0);
    expect(gun().getMinutes()).toBe(0);
  });
});
