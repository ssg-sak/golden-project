import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** E2E 시나리오와 설정을 frontend에 두어 Playwright 의존성을 동일 경계에서 해석한다. */
export default defineConfig({
  testDir: path.resolve(configDir, 'tests/e2e'),
  timeout: 30_000,
  retries: 0,
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
  },
});
