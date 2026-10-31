import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests cover the plain logic modules, so this skips the app's Vite plugins.
export default defineConfig({
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
