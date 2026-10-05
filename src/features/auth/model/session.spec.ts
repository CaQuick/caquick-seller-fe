import { router } from 'expo-router';
import { toast } from 'sonner-native';

import { getSessionHooks, refreshOnce, resetSessionHooks } from '@/shared/api';
import { mockSecureStore } from '@/test/mocks';
import { restError, restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import {
  REFRESH_TOKEN_KEY,
  bootstrap,
  changePassword,
  installSessionHooks,
  login,
  logout,
} from './session';
import { useSessionStore } from './session-store';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('sonner-native', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const session = (mustChangePassword = false) => ({
  accessToken: 'at',
  tokenType: 'Bearer' as const,
  accountStatus: 'ACTIVE' as const,
  mustChangePassword,
  refreshToken: 'rt2',
  refreshExpiresAt: '2026-11-05T00:00:00.000Z',
});

/** 호출 횟수를 세는 핸들러 — 서버를 부르지 않았음을 단언하기 위해 */
function counting(path: string, body: unknown = session()) {
  const calls: unknown[] = [];
  server.use(restOk(path, body));
  server.events.on('request:start', ({ request }) => {
    if (request.url.endsWith(path)) calls.push(request.url);
  });
  return calls;
}

describe('session', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'unknown', accessToken: null, mustChangePassword: false });
    installSessionHooks();
    jest.mocked(router.replace).mockClear();
    jest.mocked(toast.error).mockClear();
  });
  afterEach(() => {
    resetSessionHooks();
    server.events.removeAllListeners();
  });

  it('getAccessToken은 스토어의 메모리 토큰을 돌려준다', () => {
    expect(getSessionHooks().getAccessToken()).toBeNull();
    useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
    expect(getSessionHooks().getAccessToken()).toBe('at');
  });

  describe('bootstrap', () => {
    it('저장된 refreshToken이 없으면 서버 없이 anonymous로 끝난다', async () => {
      const calls = counting('/seller/refresh');
      expect(await bootstrap()).toBe('anonymous');
      expect(calls).toHaveLength(0);
    });

    it('refreshToken이 있으면 복원하고 새 토큰으로 바꿔 둔다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      server.use(restOk('/seller/refresh', session(true)));
      expect(await bootstrap()).toBe('authenticated');
      expect(useSessionStore.getState()).toMatchObject({
        accessToken: 'at',
        mustChangePassword: true,
      });
      expect(mockSecureStore.get(REFRESH_TOKEN_KEY)).toBe('rt2');
    });

    it('서버가 모르는 refreshToken은 지우고 anonymous로 끝난다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'stale');
      server.use(restError('/seller/refresh', 401, 'Unauthorized', 'INVALID_REFRESH_TOKEN'));
      expect(await bootstrap()).toBe('anonymous');
      expect(mockSecureStore.has(REFRESH_TOKEN_KEY)).toBe(false);
    });

    it('상태가 이미 확정됐으면 다시 복원하지 않는다', async () => {
      useSessionStore.getState().clear();
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      const calls = counting('/seller/refresh');
      expect(await bootstrap()).toBe('anonymous');
      expect(calls).toHaveLength(0);
    });

    it('동시에 여러 번 불려도 refresh는 한 번이다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      const calls = counting('/seller/refresh');
      await Promise.all([refreshOnce(), refreshOnce(), bootstrap()]);
      expect(calls).toHaveLength(1);
    });
  });

  describe('onForbidden', () => {
    it('PASSWORD_CHANGE_REQUIRED는 세션을 유지한 채 변경 화면으로 보낸다', () => {
      useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
      getSessionHooks().onForbidden('PASSWORD_CHANGE_REQUIRED');
      expect(useSessionStore.getState()).toMatchObject({
        status: 'authenticated',
        mustChangePassword: true,
      });
      expect(router.replace).toHaveBeenCalledWith('/change-password');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it.each([
      ['ACCOUNT_NOT_ACTIVE', '이용이 정지된 계정입니다.'],
      ['ACCOUNT_TYPE_NOT_ALLOWED', '판매자 계정만 이용할 수 있습니다.'],
    ] as const)('%s는 로컬 세션을 지우고 안내한다', async (code, message) => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
      getSessionHooks().onForbidden(code);
      await new Promise((r) => setImmediate(r));
      expect(useSessionStore.getState().status).toBe('anonymous');
      expect(mockSecureStore.has(REFRESH_TOKEN_KEY)).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(message);
      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  it('login은 refreshToken을 저장하고 세션을 연다', async () => {
    server.use(restOk('/seller/login', session()));
    await login('seller01', 'Password1!');
    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(mockSecureStore.get(REFRESH_TOKEN_KEY)).toBe('rt2');
  });

  describe('logout', () => {
    it('refreshToken이 없으면 서버를 부르지 않고 로컬만 비운다', async () => {
      useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
      const calls = counting('/seller/logout', null);
      await logout();
      expect(calls).toHaveLength(0);
      expect(useSessionStore.getState().status).toBe('anonymous');
    });

    it('서버 세션을 끝내고 로컬도 비운다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
      const calls = counting('/seller/logout', null);
      await logout();
      expect(calls).toHaveLength(1);
      expect(mockSecureStore.has(REFRESH_TOKEN_KEY)).toBe(false);
      expect(useSessionStore.getState().status).toBe('anonymous');
    });

    it('서버가 실패해도 로컬은 비운다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
      server.use(restError('/seller/logout', 500, 'boom'));
      await expect(logout()).resolves.toBeUndefined();
      expect(mockSecureStore.has(REFRESH_TOKEN_KEY)).toBe(false);
      expect(useSessionStore.getState().status).toBe('anonymous');
    });
  });

  it('changePassword는 성공하면 로컬 세션을 비운다(BE가 토큰을 전부 무효화)', async () => {
    mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
    useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: true });
    server.use(restOk('/seller/change-password', null, 204));
    await changePassword('Current1!', 'Next1234!');
    expect(mockSecureStore.has(REFRESH_TOKEN_KEY)).toBe(false);
    expect(useSessionStore.getState().status).toBe('anonymous');
  });
});
