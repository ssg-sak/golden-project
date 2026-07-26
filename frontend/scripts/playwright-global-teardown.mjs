import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
const pidFile = path.resolve('test-results', 'playwright-vite.pid');

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export default async function globalTeardown() {
  let pid;
  try {
    pid = Number.parseInt(await readFile(pidFile, 'utf8'), 10);
  } catch {
    return;
  }

  if (!Number.isInteger(pid) || pid <= 0) {
    await rm(pidFile, { force: true });
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // 이미 종료된 테스트 서버는 추가 조치가 필요하지 않다.
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  if (isRunning(pid)) {
    process.kill(pid, 'SIGKILL');
  }

  await rm(pidFile, { force: true });
}
