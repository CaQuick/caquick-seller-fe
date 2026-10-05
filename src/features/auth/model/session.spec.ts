import { router } from 'expo-router';
import { HttpResponse, http } from 'msw';
import { toast } from 'sonner-native';

import { ApiError, getSessionHooks, refreshOnce, resetSessionHooks } from '@/shared/api';
import { AUTH_URL } from '@/shared/config/env';
import { mockSecureStore } from '@/test/mocks';
import { restError, restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { SESSION_ENDED } from './messages';
import {
  REFRESH_TOKEN_KEY,
  bootstrap,
  changePassword,
  installSessionHooks,
  login,
  logout,
  onBeforeLogout,
} from './session';
import { useSessionStore } from './session-store';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('sonner-native', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const session = (mustChangePassword = false) => ({
  accessToken: 'at',
  tokenType: 'Bearer' as const,
  expiresInSeconds: 900,
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

const offline = (path: string) => http.post(`${AUTH_URL}${path}`, () => HttpResponse.error());
const flush = () => new Promise((r) => setImmediate(r));

describe('session', () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: 'unknown',
      accessToken: null,
      expiresAt: null,
      mustChangePassword: false,
    });
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
    const loadMe = jest.fn(() => Promise.resolve());
    beforeEach(() => loadMe.mockReset().mockResolvedValue(undefined));

    it('저장된 refreshToken이 없으면 서버 없이 anonymous로 끝난다', async () => {
      const calls = counting('/seller/refresh');
      expect(await bootstrap(loadMe)).toBe('ready');
      expect(useSessionStore.getState().status).toBe('anonymous');
      expect(calls).toHaveLength(0);
      expect(loadMe).not.toHaveBeenCalled();
    });

    it('refresh에 성공하면 새 토큰으로 바꿔 두고 계정을 조회한다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      server.use(restOk('/seller/refresh', session()));
      expect(await bootstrap(loadMe)).toBe('ready');
      expect(useSessionStore.getState()).toMatchObject({
        status: 'authenticated',
        accessToken: 'at',
      });
      expect(mockSecureStore.get(REFRESH_TOKEN_KEY)).toBe('rt2');
      expect(loadMe).toHaveBeenCalledTimes(1);
    });

    it('변경이 강제된 세션은 계정 조회 없이 끝난다(BE가 막는다)', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      server.use(restOk('/seller/refresh', session(true)));
      expect(await bootstrap(loadMe)).toBe('ready');
      expect(useSessionStore.getState().mustChangePassword).toBe(true);
      expect(loadMe).not.toHaveBeenCalled();
    });

    it('서버가 모르는 refreshToken은 지우고 anonymous로 끝난다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'stale');
      server.use(restError('/seller/refresh', 401, 'Unauthorized', 'INVALID_REFRESH_TOKEN'));
      expect(await bootstrap(loadMe)).toBe('ready');
      expect(useSessionStore.getState().status).toBe('anonymous');
      expect(mockSecureStore.has(REFRESH_TOKEN_KEY)).toBe(false);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('정지된 계정이면 지우고 정지 안내를 띄운다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      server.use(restError('/seller/refresh', 403, '정지', 'ACCOUNT_NOT_ACTIVE'));
      expect(await bootstrap(loadMe)).toBe('ready');
      expect(useSessionStore.getState().status).toBe('anonymous');
      expect(mockSecureStore.has(REFRESH_TOKEN_KEY)).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(SESSION_ENDED.ACCOUNT_NOT_ACTIVE);
    });

    it.each([
      ['네트워크 장애', offline('/seller/refresh')],
      ['서버 5xx', restError('/seller/refresh', 503, 'down')],
    ])('반증: %s면 토큰을 남기고 offline — 다시 부르면 이어서 복원한다', async (_, handler) => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      server.use(handler);
      expect(await bootstrap(loadMe)).toBe('offline');
      expect(useSessionStore.getState().status).toBe('unknown');
      expect(mockSecureStore.get(REFRESH_TOKEN_KEY)).toBe('rt');

      server.use(restOk('/seller/refresh', session()));
      expect(await bootstrap(loadMe)).toBe('ready');
      expect(useSessionStore.getState().status).toBe('authenticated');
    });

    it('계정 조회가 장애로 실패하면 offline, 다시 부르면 refresh 없이 조회만 한다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      const calls = counting('/seller/refresh');
      loadMe.mockRejectedValueOnce(new ApiError('네트워크 오류', 'NETWORK', null, 0));
      expect(await bootstrap(loadMe)).toBe('offline');
      expect(await bootstrap(loadMe)).toBe('ready');
      expect(calls).toHaveLength(1);
      expect(loadMe).toHaveBeenCalledTimes(2);
    });

    it('반증: 계정 조회의 장애 아닌 오류는 다시 시도하지 않는다(요청 계층이 세션을 정리)', async () => {
      useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
      loadMe.mockRejectedValueOnce(new ApiError('정지', 'FORBIDDEN', 'ACCOUNT_NOT_ACTIVE', 403));
      expect(await bootstrap(loadMe)).toBe('ready');
    });

    it('동시에 여러 번 불려도 refresh는 한 번이다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      const calls = counting('/seller/refresh');
      await Promise.all([refreshOnce(), refreshOnce(), bootstrap(loadMe)]);
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

    it.each(['ACCOUNT_NOT_ACTIVE', 'ACCOUNT_TYPE_NOT_ALLOWED'] as const)(
      '%s는 로컬 세션을 지우고 안내한다',
      async (code) => {
        mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
        useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
        getSessionHooks().onForbidden(code);
        await flush();
        expect(useSessionStore.getState().status).toBe('anonymous');
        expect(mockSecureStore.has(REFRESH_TOKEN_KEY)).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(SESSION_ENDED[code]);
        expect(router.replace).not.toHaveBeenCalled();
      },
    );

    it('반증: 동시에 여러 응답이 와도 안내는 한 번이고, 끝난 세션에는 다시 띄우지 않는다', async () => {
      useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
      getSessionHooks().onForbidden('ACCOUNT_NOT_ACTIVE');
      getSessionHooks().onForbidden('ACCOUNT_NOT_ACTIVE');
      await flush();
      getSessionHooks().onForbidden('ACCOUNT_NOT_ACTIVE');
      await flush();
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
  });

  it('login은 refreshToken을 저장하고 만료 시각과 함께 세션을 연다', async () => {
    const now = Date.now();
    server.use(restOk('/seller/login', session()));
    await login('seller01', 'Password1!');
    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(useSessionStore.getState().expiresAt).toBeGreaterThanOrEqual(now + 900_000);
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

    it('등록한 정리 → 서버 세션 종료 → SecureStore 삭제 → 스토어 비움 순서로 간다', async () => {
      mockSecureStore.set(REFRESH_TOKEN_KEY, 'rt');
      useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
      const order: string[] = [];
      server.use(
        http.post(`${AUTH_URL}/seller/logout`, () => {
          order.push('server');
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const offs = [
        onBeforeLogout(async () => {
          await flush();
          // 정리는 아직 살아 있는 세션으로 돈다(푸시 토큰 해제는 인증이 필요하다)
          order.push(`first:${useSessionStore.getState().accessToken}`);
        }),
        onBeforeLogout(() => {
          order.push('second');
          throw new Error('정리 실패');
        }),
      ];
      const unsubscribe = useSessionStore.subscribe((s) => {
        if (s.status === 'anonymous')
          order.push(mockSecureStore.has(REFRESH_TOKEN_KEY) ? 'clear(토큰 남음)' : 'clear');
      });
      await logout();
      unsubscribe();
      offs.forEach((off) => off());
      expect(order).toEqual(['first:at', 'second', 'server', 'clear']);
    });

    it('등록을 풀면 다음 로그아웃에서 부르지 않는다', async () => {
      const fn = jest.fn();
      onBeforeLogout(fn)();
      await logout();
      expect(fn).not.toHaveBeenCalled();
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
