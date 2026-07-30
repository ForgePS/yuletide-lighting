import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@clcrm/types': resolve(__dirname, 'packages/types/src/index.ts'),
      '@yuletide/firebase': resolve(__dirname, 'packages/firebase/src/index.ts'),
    },
  },
});
