/**
 * Izgara (grid) geometrisi ve zaman sabitleri.
 *
 * Sürükle-bırak matematiğinin tamamı bu üç sayıdan türetilir:
 * SLOT_MINUTES, SLOT_HEIGHT_PX ve DAY_START_MINUTE.
 * Bu dosyadaki bir değeri değiştirmek tüm takvimi tutarlı şekilde ölçekler.
 */

/** Mıknatıslanma (snap) çözünürlüğü: 15 dakika. */
export const SLOT_MINUTES = 15;

/** Bir 15 dakikalık dilimin piksel yüksekliği. */
export const SLOT_HEIGHT_PX = 20;

/** Türetilmiş: bir saatlik satırın yüksekliği (4 * 20 = 80px). */
export const HOUR_HEIGHT_PX = (60 / SLOT_MINUTES) * SLOT_HEIGHT_PX;

/** Türetilmiş: 1 dakika kaç piksel eder (20 / 15 = 1.333...). */
export const PX_PER_MINUTE = SLOT_HEIGHT_PX / SLOT_MINUTES;

/** Gün 00:00'da başlar (gece yarısından itibaren dakika). */
export const DAY_START_MINUTE = 0;

/** Gün 24:00'te biter. */
export const DAY_END_MINUTE = 24 * 60;

/** Türetilmiş: tüm ızgaranın toplam yüksekliği (1920px). */
export const TIMELINE_HEIGHT_PX =
  ((DAY_END_MINUTE - DAY_START_MINUTE) / SLOT_MINUTES) * SLOT_HEIGHT_PX;

/** Bir görev bundan kısa olamaz. */
export const MIN_TASK_MINUTES = SLOT_MINUTES;

/** Saat etiketlerinin bulunduğu sol sütunun genişliği. */
export const GUTTER_WIDTH_PX = 64;

/** localStorage anahtarı. */
export const STORAGE_KEY = 'chronoflow-store';
