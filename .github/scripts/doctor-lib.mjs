// `expo install --check --json` 결과 판정. SDK 기대 버전과 패치만 다른 패키지는 통과시키고,
// 마이너·메이저 차이나 해석할 수 없는 버전은 실패로 둔다.

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
// bundledNativeModules의 기대값은 '57.0.33'·'~57.0.33'·'^2.2.0' 꼴만 쓴다. 다른 범위 표현은 해석하지 않는다.
const EXPECTED = /^[~^]?(\d+\.\d+\.\d+)$/;

function parseVersion(text) {
  const m = VERSION.exec(text);
  return m ? m.slice(1, 4).map(Number) : null;
}

function isPatchOnly(dep) {
  const expected = EXPECTED.exec(String(dep.expectedVersionOrRange ?? '').trim());
  const want = expected ? parseVersion(expected[1]) : null;
  const have = parseVersion(String(dep.actualVersion ?? '').trim());
  return want !== null && have !== null && want[0] === have[0] && want[1] === have[1];
}

function describe(deps) {
  return deps
    .map((d) => `  ${d.packageName}: 기대 ${d.expectedVersionOrRange}, 설치 ${d.actualVersion}`)
    .join('\n');
}

export function judgeVersionCheck(status, stdout) {
  // expo CLI가 JSON 앞에 "env: load .env.development" 같은 안내 줄을 stdout으로 찍는다
  const text = String(stdout ?? '');
  const start = text.search(/^\{/m);
  let result;
  try {
    result = JSON.parse(start === -1 ? text : text.slice(start));
  } catch {
    return {
      ok: false,
      message: `expo install --check 출력을 해석하지 못했습니다(exit ${status}).\n${stdout}`,
    };
  }
  const deps = Array.isArray(result?.dependencies) ? result.dependencies : null;
  if (deps === null) {
    return {
      ok: false,
      message: `expo install --check 출력에 dependencies가 없습니다(exit ${status}).`,
    };
  }
  if (deps.length === 0) {
    return status === 0
      ? { ok: true, message: 'SDK 호환 버전 검사: 모두 일치' }
      : {
          ok: false,
          message: `expo install --check가 실패했지만 불일치 목록이 비어 있습니다(exit ${status}).`,
        };
  }
  const blocking = deps.filter((d) => !isPatchOnly(d));
  if (blocking.length > 0) {
    return { ok: false, message: `SDK 호환 버전 검사 실패(패치 외 차이):\n${describe(blocking)}` };
  }
  return { ok: true, message: `SDK 호환 버전 검사: 패치 차이만 있어 통과\n${describe(deps)}` };
}
