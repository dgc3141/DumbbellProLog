import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      GEMINI_API_KEY: 'test-key',
      TABLE_NAME: 'DumbbellProLog',
    },
  },
});
