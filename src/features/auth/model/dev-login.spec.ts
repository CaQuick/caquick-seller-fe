import { HttpResponse, http } from 'msw';

import { ApiError, refreshOnce, resetSessionHooks } from '@/shared/api';
import { AUTH_URL } from '@/shared/config/env';
import { mockSecureStore } from '@/test/mocks';
import { restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import {
  DEV_LOGIN_COPY,
  SECRET_TAP_GAP_MS,
  accountIdSchema,
  countTap,
  devLogin,
  devLoginMessage,
} from './dev-login';
import { REFRESH_TOKEN_KEY, installSessionHooks } from './session';
import { useSessionStore } from './session-store';

const token = { accessToken: 'dev-at', tokenType: 'Bearer', expiresInSeconds: 900 };

describe('countTap', () => {
  const tapAll = (times: number[]) => {
    let state = { count: 0, at: 0 };
    return times.map((now) => {
      const { next, open } = countTap(state, now);
      state = next;
      return open;
    });
  };

  it('간격 안에서 다섯 번째 탭에만 연다', () => {
    expect(tapAll([5_000, 5_100, 5_200, 5_300, 5_400])).toEqual([false, false, false, false, true]);
  });

  it('반증: 간격을 넘긴 탭은 처음부터 다시 센다', () => {
    const gap = SECRET_TAP_GAP_MS + 1;
    expect(tapAll([5_000, 5_100, 5_200, 5_300, 5_300 + gap]).at(-1)).toBe(false);
  });

  it('연 뒤에는 다시 다섯 번을 채워야 연다', () => {
    const opened = tapAll(Array.from({ length: 10 }, (_, i) => 5_000 + i * 100));
    expect(opened.filter(Boolean)).toHaveLength(2);
    expect(opened[4]).toBe(true);
    expect(opened[9]).toBe(true);
  });
});

describe('accountIdSchema', () => {
  it.each([
    ['12', true],
    [' 7 ', true],
    ['9007199254740993', true],
    ['', false],
    ['0', false],
    ['012', false],
    ['-1', false],
    ['1.5', false],
    ['abc', false],
    ['1'.repeat(20), false],
  ])('%j → %s', (raw, ok) => {
    expect(accountIdSchema.safeParse(raw).success).toBe(ok);
  });
});

describe('devLoginMessage', () => {
  it('DEV_ONLY_ENDPOINT는 운영 서버 안내로 바꾼다', () => {
    const error = new ApiError('개발 환경에서만…', 'FORBIDDEN', 'DEV_ONLY_ENDPOINT', 403);
    expect(devLoginMessage(error)).toBe(DEV_LOGIN_COPY.devOnly);
  });

  it('그 밖의 코드는 공용 문구를 따른다', () => {
    const error = new ApiError('x', 'FORBIDDEN', 'ACCOUNT_NOT_ACTIVE', 403);
    expect(devLoginMessage(error)).toBe('이용이 정지된 계정입니다. 관리자에게 문의해 주세요.');
  });
});

describe('devLogin (MSW)', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'anonymous', accessToken: null, expiresAt: null });
    installSessionHooks();
  });
  afterEach(() => resetSessionHooks());

  it('accountId를 문자열로 보내고 메모리 세션을 연다', async () => {
    let body: unknown;
    server.use(
      http.post(`${AUTH_URL}/dev/issue-token`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(token);
      }),
    );
    await devLogin('12');
    expect(body).toEqual({ accountId: '12' });
    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'dev-at',
      mustChangePassword: false,
    });
    expect(useSessionStore.getState().expiresAt).toBeGreaterThan(Date.now());
    expect(mockSecureStore.has(REFRESH_TOKEN_KEY)).toBe(false);
  });

  it('만료 갱신 때 refresh 토큰이 없으니 다른 계정으로 갱신하지 않고 세션을 닫는다', async () => {
    // 반증: 남은 refresh 토큰을 지우지 않으면 /seller/refresh가 불려 그 계정 세션으로 바뀐다
    mockSecureStore.set(REFRESH_TOKEN_KEY, 'stale');
    let refreshed = 0;
    server.use(
      restOk('/dev/issue-token', token),
      http.post(`${AUTH_URL}/seller/refresh`, () => {
        refreshed += 1;
        return HttpResponse.json({ accessToken: 'other', refreshToken: 'rt2' });
      }),
    );
    await devLogin('12');
    await expect(refreshOnce()).resolves.toBe(false);
    expect(refreshed).toBe(0);
    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', accessToken: null });
  });
});
