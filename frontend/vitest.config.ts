import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** 테스트 소스는 tests/unit/frontend, 설정만 frontend에 둠 (node_modules 해석) */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(configDir, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['../tests/unit/frontend/**/*.test.ts'],
  },
});
