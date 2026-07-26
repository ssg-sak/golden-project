import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createServer } from 'vite';


const runtimeDirectory = path.resolve('test-results');
const pidFile = path.join(runtimeDirectory, 'playwright-vite.pid');

await mkdir(runtimeDirectory, { recursive: true });
await writeFile(pidFile, String(process.pid), 'utf8');

const server = await createServer({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});

await server.listen();

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  await server.close();
  await rm(pidFile, { force: true });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await new Promise(() => {});
