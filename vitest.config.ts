import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig(({ mode }) => {
  // vitest, spre deosebire de Next.js, nu încarcă automat .env.local.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    resolve: {
      alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
    },
    test: { include: ['tests/**/*.test.ts'] },
  };
});
