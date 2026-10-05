import * as SecureStore from 'expo-secure-store';

/** refreshToken은 여기에만 둔다(D7). accessToken은 메모리. */
export const REFRESH_TOKEN_KEY = 'caquick.refreshToken';

/** 키체인·키스토어 오류(기기 잠금·백업 복원 직후 등)는 "토큰 없음"으로 본다 — 부팅이 멈추면 안 된다. */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 저장 실패면 false — 세션은 이번 실행 동안만 유지된다. */
export async function setRefreshToken(token: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return true;
  } catch {
    return false;
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // 이미 없거나 접근 불가 — 로그아웃 흐름을 막지 않는다
  }
}
