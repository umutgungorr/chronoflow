import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Testler yalnızca SAF modülleri hedefliyor (lib/*): zamanlama motoru,
 * yerleşim matematiği, Türkçe ayrıştırıcı. Bunlar React'tan ve tarayıcıdan
 * bağımsız yazıldığı için ne jsdom ne de kurulum dosyası gerekiyor.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
