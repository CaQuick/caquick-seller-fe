import { type ForbiddenCode } from './errors';

/**
 * 요청 계층이 인증 계층(라우터·스토어)을 모른 채 토큰을 붙이고 만료·권한 변화를 넘기는 접점.
 * auth feature가 부팅 시 register한다. 등록 전에는 토큰 없음·갱신 실패·403 무시로 동작한다.
 */
export interface SessionHooks {
  getAccessToken: () => string | null;
  /** 401·UNAUTHENTICATED에서 1회 호출. 새 토큰을 얻으면 true — 호출자는 요청을 한 번 더 보낸다. */
  refresh: () => Promise<boolean>;
  /** 세션 상태를 바꿔야 하는 403(비밀번호 변경 필요·정지·계정 유형)을 받았을 때 1회 호출. */
  onForbidden: (code: ForbiddenCode) => void;
}

const DEFAULT_HOOKS: SessionHooks = {
  getAccessToken: () => null,
  refresh: () => Promise.resolve(false),
  onForbidden: () => undefined,
};

let hooks: SessionHooks = DEFAULT_HOOKS;

export function registerSessionHooks(next: Partial<SessionHooks>): void {
  hooks = { ...DEFAULT_HOOKS, ...next };
}

/** 테스트·로그아웃용 초기화. */
export function resetSessionHooks(): void {
  hooks = DEFAULT_HOOKS;
}

export function getSessionHooks(): SessionHooks {
  return hooks;
}

/** 동시에 여러 요청이 만료를 만나도 refresh는 한 번만 — 같은 promise를 공유한다. */
let inflight: Promise<boolean> | null = null;
export function refreshOnce(): Promise<boolean> {
  inflight ??= hooks.refresh().finally(() => {
    inflight = null;
  });
  return inflight;
}
