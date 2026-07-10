import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** E2E 시나리오는 tests/e2e, 설정만 frontend에 둠 (node_modules 해석) */
export default defineConfig({
  testDir: path.resolve(configDir, '../tests/e2e'),
  timeout: 30_000,
  retries: 0,
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
  },
});
