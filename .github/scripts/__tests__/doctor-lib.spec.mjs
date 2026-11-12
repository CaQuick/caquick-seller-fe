import assert from 'node:assert/strict';
import test from 'node:test';

import { judgeVersionCheck } from '../doctor-lib.mjs';

const dep = (packageName, expectedVersionOrRange, actualVersion) => ({
  packageName,
  packageType: 'dependencies',
  expectedVersionOrRange,
  actualVersion,
});
const out = (dependencies, upToDate = dependencies.length === 0) =>
  JSON.stringify({ dependencies, upToDate }, null, 2);

const cases = [
  ['모두 일치하면 통과', 0, out([]), true],
  ['틸드 기대값과 패치만 다르면 통과', 1, out([dep('expo', '~57.0.33', '57.0.26')]), true],
  ['고정 기대값과 패치만 다르면 통과', 1, out([dep('react-native', '0.86.5', '0.86.3')]), true],
  ['캐럿 기대값과 패치만 다르면 통과', 1, out([dep('a', '^2.2.1', '2.2.0')]), true],
  [
    '여러 패키지가 모두 패치 차이면 통과',
    1,
    out([dep('expo', '~57.0.33', '57.0.26'), dep('expo-router', '~57.0.31', '57.0.24')]),
    true,
  ],
  ['마이너가 다르면 실패', 1, out([dep('react-native', '0.86.3', '0.88.1')]), false],
  ['메이저가 다르면 실패', 1, out([dep('expo', '~57.0.33', '58.0.1')]), false],
  [
    '패치 차이와 마이너 차이가 섞이면 실패',
    1,
    out([dep('expo', '~57.0.33', '57.0.26'), dep('react', '19.2.3', '19.3.1')]),
    false,
  ],
  ['기대값이 해석할 수 없는 범위면 실패', 1, out([dep('a', '>=1.2.0 <2.0.0', '1.2.0')]), false],
  ['설치 버전이 프리릴리스면 실패', 1, out([dep('a', '~1.2.3', '1.2.4-beta.1')]), false],
  ['설치 버전이 없으면 실패', 1, out([dep('a', '~1.2.3', undefined)]), false],
  [
    'JSON 앞에 안내 줄이 있어도 해석해 판정',
    1,
    `env: load .env.development\n${out([dep('expo', '~57.0.33', '57.0.26')])}`,
    true,
  ],
  [
    '안내 줄 뒤 JSON이 마이너 차이면 실패',
    1,
    `env: load .env.development\n${out([dep('react', '19.2.3', '19.3.1')])}`,
    false,
  ],
  [
    'JSON 뒤에 다른 출력이 붙으면 실패',
    1,
    `${out([dep('expo', '~57.0.33', '57.0.26')])}\nwarning: x`,
    false,
  ],
  ['JSON이 아니면 실패', 1, 'Error: network request failed', false],
  ['출력이 비어 있으면 실패', 1, '', false],
  ['dependencies가 없으면 실패', 1, JSON.stringify({ upToDate: false }), false],
  ['종료 코드가 실패인데 불일치 목록이 비어 있으면 실패', 1, out([]), false],
];

for (const [name, status, stdout, ok] of cases) {
  test(name, () => {
    assert.equal(judgeVersionCheck(status, stdout).ok, ok);
  });
}

test('실패 메시지에 패치 외 차이 패키지만 적는다', () => {
  const { message } = judgeVersionCheck(
    1,
    out([dep('expo', '~57.0.33', '57.0.26'), dep('react', '19.2.3', '19.3.1')]),
  );
  assert.match(message, /react: 기대 19\.2\.3, 설치 19\.3\.1/);
  assert.doesNotMatch(message, /expo:/);
});
