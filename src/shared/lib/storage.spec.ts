import * as SecureStore from 'expo-secure-store';

import { mockSecureStore } from '@/test/mocks';

import { REFRESH_TOKEN_KEY, clearRefreshToken, getRefreshToken, setRefreshToken } from './storage';

describe('refreshToken SecureStore', () => {
  it('저장 → 읽기 → 삭제', async () => {
    expect(await getRefreshToken()).toBeNull();
    expect(await setRefreshToken('r1')).toBe(true);
    expect(mockSecureStore.get(REFRESH_TOKEN_KEY)).toBe('r1');
    expect(await getRefreshToken()).toBe('r1');
    await clearRefreshToken();
    expect(await getRefreshToken()).toBeNull();
  });

  it('키체인 접근성은 첫 잠금 해제 뒤', async () => {
    await setRefreshToken('r1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'r1', {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  });

  it('반증: 네이티브 오류는 삼킨다 — 읽기 null·저장 false·삭제 무시', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keychain'));
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keychain'));
    jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('keychain'));
    expect(await getRefreshToken()).toBeNull();
    expect(await setRefreshToken('r1')).toBe(false);
    await expect(clearRefreshToken()).resolves.toBeUndefined();
  });
});
