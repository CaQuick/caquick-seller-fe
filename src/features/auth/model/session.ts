import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import {
  ApiError,
  type CredentialSession,
  type ForbiddenCode,
  messageFor,
  refreshOnce,
  registerSessionHooks,
  sellerAuthApi,
} from '@/shared/api';
import { showToast } from '@/shared/ui';

import { type SessionStatus, useSessionStore } from './session-store';

export const REFRESH_TOKEN_KEY = 'caquick.refreshToken';

async function persist(res: CredentialSession): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.refreshToken);
  useSessionStore.getState().setSession(res);
}

/** 기기의 세션 흔적을 지운다. BE 호출 성패와 무관하게 항상 끝까지 간다 */
async function clearLocal(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  useSessionStore.getState().clear();
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
  } catch {
    // iOS 재설치 뒤 남은 토큰처럼 BE가 모르는 값은 지워 둔다
    await clearLocal();
    return false;
  }
}

/** FORBIDDEN 코드별 처리 — 요청 계층이 한 번만 부른다 */
function onForbidden(code: ForbiddenCode): void {
  if (code === 'PASSWORD_CHANGE_REQUIRED') {
    useSessionStore.setState({ mustChangePassword: true });
    router.replace('/change-password');
    return;
  }
  void clearLocal().then(() =>
    showToast.error(messageFor(new ApiError(code, 'FORBIDDEN', code, 403))),
  );
}

/** 요청 계층에 토큰·갱신·403 처리를 연결한다. 앱 부팅 시 1회 */
export function installSessionHooks(): void {
  registerSessionHooks({
    getAccessToken: () => useSessionStore.getState().accessToken,
    refresh,
    onForbidden,
  });
}

/** 세션 상태를 확정한다. 모르면 SecureStore의 refreshToken으로 복원을 시도한다 */
export async function bootstrap(): Promise<SessionStatus> {
  if (useSessionStore.getState().status !== 'unknown') return useSessionStore.getState().status;
  await refreshOnce();
  return useSessionStore.getState().status;
}

export async function login(username: string, password: string): Promise<void> {
  await persist(await sellerAuthApi.login({ username, password }));
}

/** 서버 세션은 best effort — 닿지 않거나 이미 모르는 토큰이어도 로컬은 비운다 */
export async function logout(): Promise<void> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  try {
    if (refreshToken) await sellerAuthApi.logout(refreshToken);
  } catch {
    // 로컬 정리가 우선
  } finally {
    await clearLocal();
  }
}

/** 성공하면 BE가 기존 토큰을 전부 무효화하므로 로컬도 비운다 — 호출자가 로그인 화면으로 보낸다 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await sellerAuthApi.changePassword({ currentPassword, newPassword });
  await clearLocal();
}
