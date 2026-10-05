import { HttpResponse, http } from 'msw';

import { AUTH_URL } from '@/shared/config/env';
import { restError, restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { ApiError } from './errors';
import { authRequest, sellerAuthApi, toFieldErrors } from './rest-client';
import { registerSessionHooks, resetSessionHooks } from './session';

describe('authRequest', () => {
  afterEach(() => resetSessionHooks());

  it('JSON 본문과 X-Client: mobile을 보내고 응답 본문을 돌려준다(쿠키 없음)', async () => {
    let received: unknown;
    let xClient: string | null = null;
    let credentials: RequestCredentials | undefined;
    server.use(
      http.post(`${AUTH_URL}/seller/login`, async ({ request }) => {
        received = await request.json();
        xClient = request.headers.get('x-client');
        credentials = request.credentials;
        return HttpResponse.json({ accessToken: 'a', refreshToken: 'r' });
      }),
    );
    const res = await sellerAuthApi.login({ username: 'u', password: 'p' });
    expect(res.accessToken).toBe('a');
    expect(res.refreshToken).toBe('r');
    expect(received).toEqual({ username: 'u', password: 'p' });
    expect(xClient).toBe('mobile');
    expect(credentials).not.toBe('include');
  });

  it('refresh·logout은 바디로 refreshToken을 보내고 Authorization은 붙이지 않는다', async () => {
    registerSessionHooks({ getAccessToken: () => 'tok' });
    const seen: { path: string; body: unknown; auth: string | null }[] = [];
    server.use(
      http.post(`${AUTH_URL}/seller/:action`, async ({ request, params }) => {
        seen.push({
          path: String(params.action),
          body: await request.json(),
          auth: request.headers.get('authorization'),
        });
        return params.action === 'logout'
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.json({ accessToken: 'new', refreshToken: 'r2' });
      }),
    );
    await expect(sellerAuthApi.refresh('r1')).resolves.toMatchObject({ accessToken: 'new' });
    await expect(sellerAuthApi.logout('r1')).resolves.toBeUndefined();
    expect(seen).toEqual([
      { path: 'refresh', body: { refreshToken: 'r1' }, auth: null },
      { path: 'logout', body: { refreshToken: 'r1' }, auth: null },
    ]);
  });

  it('204는 undefined', async () => {
    server.use(restOk('/seller/logout', null, 204));
    await expect(authRequest('/seller/logout')).resolves.toBeUndefined();
  });

  it('에러 envelope는 errorCode·상태 분류를 가진 ApiError', async () => {
    server.use(restError('/seller/login', 401, '아이디 또는 비밀번호', 'INVALID_CREDENTIALS'));
    const err = await authRequest('/seller/login', { body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      classification: 'UNAUTHENTICATED',
      status: 401,
      fieldErrors: null,
    });
  });

  it('429 LOGIN_RATE_LIMITED는 TOO_MANY_REQUESTS', async () => {
    server.use(restError('/seller/login', 429, '너무 많음', 'LOGIN_RATE_LIMITED'));
    await expect(authRequest('/seller/login', { body: {} })).rejects.toMatchObject({
      classification: 'TOO_MANY_REQUESTS',
      code: 'LOGIN_RATE_LIMITED',
    });
  });

  it('본문 없는 에러도 상태로 분류한다', async () => {
    server.use(
      http.post(`${AUTH_URL}/seller/refresh`, () => new HttpResponse(null, { status: 403 })),
    );
    await expect(authRequest('/seller/refresh')).rejects.toMatchObject({
      classification: 'FORBIDDEN',
      code: null,
    });
  });

  describe('400 validation → fieldErrors', () => {
    it('data[]를 필드 → 첫 위반 문구 맵으로 바꾼다', async () => {
      server.use(
        http.post(`${AUTH_URL}/seller/change-password`, () =>
          HttpResponse.json(
            {
              message: '입력값이 올바르지 않습니다.',
              code: 400,
              errorCode: 'VALIDATION_FAILED',
              data: [
                {
                  property: 'newPassword',
                  constraints: { isStrongPassword: '비밀번호가 약합니다', isString: '문자열' },
                },
                { property: 'currentPassword', constraints: {} },
              ],
            },
            { status: 400 },
          ),
        ),
      );
      const err = await sellerAuthApi
        .changePassword({ currentPassword: 'a', newPassword: 'b' })
        .catch((e: unknown) => e);
      expect(err).toMatchObject({
        classification: 'BAD_USER_INPUT',
        code: 'VALIDATION_FAILED',
        fieldErrors: {
          newPassword: '비밀번호가 약합니다',
          currentPassword: '입력값이 올바르지 않습니다.',
        },
      });
    });

    it.each([
      ['data 없음', { message: 'x' }],
      ['data null', { message: 'x', data: null }],
      ['data 빈 배열', { message: 'x', data: [] }],
    ])('반증: %s이면 fieldErrors는 null', (_, body) => {
      expect(toFieldErrors(body)).toBeNull();
    });

    it('반증: 400이 아니면 data[]가 있어도 fieldErrors를 만들지 않는다', async () => {
      server.use(
        http.post(`${AUTH_URL}/seller/login`, () =>
          HttpResponse.json(
            { message: 'x', data: [{ property: 'username', constraints: { a: 'b' } }] },
            { status: 409 },
          ),
        ),
      );
      await expect(authRequest('/seller/login', { body: {} })).rejects.toMatchObject({
        status: 409,
        fieldErrors: null,
      });
    });
  });

  it('auth: true면 Bearer 토큰을 붙인다', async () => {
    registerSessionHooks({ getAccessToken: () => 'tok' });
    let auth: string | null = null;
    server.use(
      http.post(`${AUTH_URL}/seller/change-password`, ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await sellerAuthApi.changePassword({ currentPassword: 'a', newPassword: 'b' });
    expect(auth).toBe('Bearer tok');
  });

  describe('auth 요청의 401 재시도', () => {
    /** 첫 요청은 주어진 에러, 이후는 성공. 받은 Authorization 헤더를 순서대로 모은다. */
    function changePasswordOnce(status: number, errorCode: string | null) {
      const auths: (string | null)[] = [];
      server.use(
        http.post(`${AUTH_URL}/seller/change-password`, ({ request }) => {
          auths.push(request.headers.get('authorization'));
          return auths.length === 1
            ? HttpResponse.json({ message: 'x', code: status, data: null, errorCode }, { status })
            : HttpResponse.json({ ok: true });
        }),
      );
      return auths;
    }

    function hooks(refreshed: boolean) {
      let token = 'old';
      const refresh = jest.fn(() => {
        if (refreshed) token = 'new';
        return Promise.resolve(refreshed);
      });
      registerSessionHooks({ getAccessToken: () => token, refresh });
      return refresh;
    }

    it.each([
      [true, 401, 'INVALID_ACCESS_TOKEN', 1],
      [true, 401, 'AUTHENTICATION_REQUIRED', 1],
      [true, 401, 'CURRENT_PASSWORD_INVALID', 0],
      [true, 401, 'SESSION_ACCOUNT_MISSING', 1],
      [true, 401, null, 1],
      [true, 403, 'INVALID_ACCESS_TOKEN', 0],
      [false, 401, 'INVALID_ACCESS_TOKEN', 0],
    ] as const)('auth=%s·%d·%s면 refresh %d회', async (auth, status, errorCode, calls) => {
      const refresh = hooks(true);
      changePasswordOnce(status, errorCode);
      await authRequest('/seller/change-password', { auth, body: {} }).catch(() => undefined);
      expect(refresh).toHaveBeenCalledTimes(calls);
    });

    it('토큰 만료 401은 갱신한 토큰으로 한 번 더 보내 성공한다', async () => {
      hooks(true);
      const auths = changePasswordOnce(401, 'INVALID_ACCESS_TOKEN');
      await expect(
        sellerAuthApi.changePassword({ currentPassword: 'a', newPassword: 'b' }),
      ).resolves.toEqual({ ok: true });
      expect(auths).toEqual(['Bearer old', 'Bearer new']);
    });

    it('현재 비밀번호 오류 401은 재시도 없이 그대로 던진다', async () => {
      hooks(true);
      const auths = changePasswordOnce(401, 'CURRENT_PASSWORD_INVALID');
      await expect(
        sellerAuthApi.changePassword({ currentPassword: 'a', newPassword: 'b' }),
      ).rejects.toMatchObject({ code: 'CURRENT_PASSWORD_INVALID', status: 401 });
      expect(auths).toHaveLength(1);
    });

    it('refresh가 실패하면 재시도 없이 원래 401을 던진다', async () => {
      hooks(false);
      const auths = changePasswordOnce(401, 'INVALID_ACCESS_TOKEN');
      await expect(
        authRequest('/seller/change-password', { auth: true, body: {} }),
      ).rejects.toMatchObject({ code: 'INVALID_ACCESS_TOKEN', classification: 'UNAUTHENTICATED' });
      expect(auths).toHaveLength(1);
    });
  });

  it('네트워크 실패는 NETWORK', async () => {
    server.use(http.post(`${AUTH_URL}/seller/login`, () => HttpResponse.error()));
    await expect(authRequest('/seller/login', { body: {} })).rejects.toMatchObject({
      classification: 'NETWORK',
    });
  });
});
