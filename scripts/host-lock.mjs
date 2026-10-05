#!/usr/bin/env node
// 맥미니 공용 호스트 락 — BE jest(src/test/jest-host-lock.ts)와 같은 규약: 127.0.0.1:47391을 exclusive로 listen한 쪽이 보유자.
// 프로세스가 어떻게 끝나든 OS가 포트를 풀어 고아 락이 없다.
//   acquire: node scripts/host-lock.mjs acquire [--timeout-sec 1800] → 락을 쥔 백그라운드 PID를 stdout에 출력. kill하면 해제.
//   hold   : (내부) 포트를 잡을 때까지 2초 간격으로 재시도, 잡으면 'held'를 출력하고 유지. 기한 초과면 exit 75.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const PORT = 47391;
const POLL_MS = 2000;
const mode = process.argv[2];
const idx = process.argv.indexOf('--timeout-sec');
const timeoutSec = idx === -1 ? 1800 : Number(process.argv[idx + 1]);

if (mode === 'acquire') {
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), 'hold', '--timeout-sec', String(timeoutSec)],
    { detached: true, stdio: ['ignore', 'pipe', 'inherit'] },
  );
  child.stdout.once('data', () => {
    console.log(child.pid);
    child.unref();
    process.exit(0);
  });
  child.once('exit', (code) => {
    console.error(`호스트 락을 ${timeoutSec}초 안에 잡지 못했다(exit ${code})`);
    process.exit(code ?? 1);
  });
} else if (mode === 'hold') {
  const deadline = Date.now() + timeoutSec * 1000;
  let waited = false;
  const tryListen = () => {
    const server = createServer();
    server.once('error', (error) => {
      if (error.code !== 'EADDRINUSE') throw error;
      if (Date.now() > deadline) process.exit(75);
      if (!waited) {
        console.error(`다른 jest·빌드가 끝나기를 기다린다(호스트 락 127.0.0.1:${PORT})`);
        waited = true;
      }
      setTimeout(tryListen, POLL_MS);
    });
    server.listen({ port: PORT, host: '127.0.0.1', exclusive: true }, () => {
      process.stdout.write('held\n');
    });
  };
  tryListen();
} else {
  console.error('사용: node scripts/host-lock.mjs acquire [--timeout-sec N]');
  process.exit(2);
}
