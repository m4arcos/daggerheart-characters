import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    env: {
      DATABASE_URL: 'postgresql://analise:analise_dev@localhost:5432/daggerheart_test',
      NODE_ENV: 'test',
    },
  },
});
