import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    env: {
      DB_PATH: ':memory:',
      NODE_ENV: 'test',
    },
  },
});
