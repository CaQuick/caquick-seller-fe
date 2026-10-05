import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import {
  ApiError,
  type CredentialSession,
  type ForbiddenCode,
  isForbiddenCode,
  isTransientError,
  refreshOnce,
  registerSessionHooks,
  sellerAuthApi,
} from '@/shared/api';
import { showToast } from '@/shared/ui';

import { SESSION_ENDED } from './messages';
import { useSessionStore } from './session-store';

export const REFRESH_TOKEN_KEY = 'caquick.refreshToken';

async function persist(res: CredentialSession): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.refreshToken);
  useSessionStore.getState().setSession(res);
}

let ending: Promise<void> | null = null;

/**
 * 기기의 세션 흔적을 지운다(SecureStore → 스토어 순, 스토어가 비면 루트가 ws·캐시를 정리한다).
 * 동시에 여러 403이 와도 정리·안내는 한 번이고, 이미 끝난 세션이면 안내를 반복하지 않는다.
 */
function endSession(notice?: string): Promise<void> {
  ending ??= (async () => {
    const notify = notice !== undefined && useSessionStore.getState().status !== 'anonymous';
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    useSessionStore.getState().clear();
    if (notify) showToast.error(notice);
  })().finally(() => {
    ending = null;
  });
  return ending;
}

function noticeFor(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || !isForbiddenCode(error.code)) return undefined;
  return error.code === 'PASSWORD_CHANGE_REQUIRED' ? undefined : SESSION_ENDED[error.code];
}

async function refresh(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    useSessionStore.getState().clear();
    return false;
  }
  try {
    await persist(await sellerAuthApi.refresh(refreshToken));
    return true;
  } catch (e) {
    // 네트워크·서버 장애는 세션이 끝난 게 아니다 — 토큰을 남겨 다시 시도한다
    if (isTransientError(e)) return false;
    // iOS 재설치 뒤 남은 토큰처럼 BE가 모르는 값, 정지된 계정은 지운다
    await endSession(noticeFor(e));
    return false;
  }
}

/** FORBIDDEN 코드별 처리 — 요청 계층이 응답당 한 번 부른다 */
function onForbidden(code: ForbiddenCode): void {
  if (code === 'PASSWORD_CHANGE_REQUIRED') {
    useSessionStore.setState({ mustChangePassword: true });
    router.replace('/change-password');
    return;
  }
  void endSession(SESSION_ENDED[code]);
}

/** 요청 계층에 토큰·갱신·403 처리를 연결한다. 앱 부팅 시 1회 */
export function installSessionHooks(): void {
  registerSessionHooks({
    getAccessToken: () => useSessionStore.getState().accessToken,
    refresh,
    onForbidden,
  });
}

export type BootResult = 'ready' | 'offline';

/**
 * 세션을 확정한다: 저장된 refreshToken으로 refresh 1회 → 변경 강제가 아니면 계정 조회(loadMe).
 * 네트워크·서버 장애면 토큰을 남긴 채 'offline'을 돌려주고, 다시 부르면 끝난 단계는 건너뛴다.
 */
export async function bootstrap(loadMe: () => Promise<unknown>): Promise<BootResult> {
  const session = () => useSessionStore.getState();
  if (session().status === 'unknown') await refreshOnce();
  if (session().status === 'unknown') return 'offline';
  if (session().status === 'authenticated' && !session().mustChangePassword) {
    try {
      await loadMe();
    } catch (e) {
      // 403·401은 요청 계층이 세션을 정리했다. 장애만 다시 시도 대상이다
      if (isTransientError(e)) return 'offline';
    }
  }
  return 'ready';
}

export async function login(username: string, password: string): Promise<void> {
  await persist(await sellerAuthApi.login({ username, password }));
}

type BeforeLogout = () => Promise<void> | void;
const beforeLogout: BeforeLogout[] = [];

/** 서버 세션을 끝내기 전에 부를 정리(푸시 토큰 해제 등)를 등록한다. 반환 함수로 등록을 푼다 */
export function onBeforeLogout(fn: BeforeLogout): () => void {
  beforeLogout.push(fn);
  return () => {
    const i = beforeLogout.indexOf(fn);
    if (i >= 0) beforeLogout.splice(i, 1);
  };
}

/** 등록 순서대로 정리 → 서버 세션 종료 → 로컬 정리. 서버 쪽은 best effort라 실패해도 로컬은 비운다 */
export async function logout(): Promise<void> {
  for (const fn of [...beforeLogout]) {
    try {
      await fn();
    } catch {
      // 정리 실패가 로그아웃을 막지 않는다
    }
  }
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  try {
    if (refreshToken) await sellerAuthApi.logout(refreshToken);
  } catch {
    // 로컬 정리가 우선
  } finally {
    await endSession();
  }
}

/** 성공하면 BE가 기존 토큰을 전부 무효화하므로 로컬도 비운다 — 호출자가 로그인 화면으로 보낸다 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await sellerAuthApi.changePassword({ currentPassword, newPassword });
  await endSession();
}
