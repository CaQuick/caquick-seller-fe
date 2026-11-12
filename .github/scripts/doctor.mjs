#!/usr/bin/env node

// expo-doctor 래퍼. Expo가 SDK 패치를 낼 때마다 코드 변경 없이 doctor가 실패하는 것을 막는다.
// SDK 호환 버전 검사만 빼서 직접 돌리고 패치 차이는 통과시킨다. 마이너·메이저 차이와 나머지 doctor 검사는 그대로 실패한다.

import { spawnSync } from 'node:child_process';
import { judgeVersionCheck } from './doctor-lib.mjs';

const doctor = spawnSync('expo-doctor', [], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_DOCTOR_SKIP_DEPENDENCY_VERSION_CHECK: '1' },
});
if (doctor.status !== 0) {
  process.exit(doctor.status ?? 1);
}

// expo-doctor가 내부에서 이 검사를 돌릴 때와 같은 환경(CI=1, EXPO_DEBUG=0)
const check = spawnSync('expo', ['install', '--check', '--json'], {
  stdio: ['ignore', 'pipe', 'inherit'],
  encoding: 'utf8',
  env: { ...process.env, CI: '1', EXPO_DEBUG: '0' },
});
const verdict = judgeVersionCheck(check.status, check.stdout);
console.log(verdict.message);
process.exit(verdict.ok ? 0 : 1);
