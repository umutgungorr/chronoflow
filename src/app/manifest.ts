import type { MetadataRoute } from 'next';

/**
 * PWA künyesi. Next bunu `/manifest.webmanifest` olarak yayınlar.
 *
 * Tek işlevi telefona "bu bir sayfa değil, kurulabilir bir uygulama" demek:
 * ana ekranda kendi ikonuyla durur ve `standalone` sayesinde adres çubuğu
 * olmadan açılır. Dikey bir zaman ızgarasında o çubuğun kapladığı ~60px
 * doğrudan bir saatlik görünür alan demek.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ChronoFlow — Günlük Zaman Bloklama',
    short_name: 'ChronoFlow',
    description:
      'Sürükle-bırak destekli, akıllı tampon süreli günlük zaman planlama uygulaması.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'tr',
    // Açılış ekranının rengi. Tema sisteme göre değiştiği için tek bir değer
    // seçmek zorundayız; mürekkep tarafını tercih ettim — akşam kullanımda
    // beyaz bir parlama, sabah kullanımda koyu bir kareden daha rahatsız.
    background_color: '#080a0e',
    theme_color: '#080a0e',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
