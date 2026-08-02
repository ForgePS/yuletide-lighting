import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 180_000,
    pool: 'forks',
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@clcrm/types': resolve(__dirname, 'packages/types/src/index.ts'),
      '@clcrm/validators': resolve(__dirname, 'packages/validators/src/index.ts'),
      '@clcrm/api': resolve(__dirname, 'packages/api/src/index.ts'),
      '@yuletide/firebase': resolve(__dirname, 'packages/firebase/src/index.ts'),
    },
  },
});
