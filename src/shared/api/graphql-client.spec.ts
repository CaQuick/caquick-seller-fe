import { HttpResponse, graphql, http } from 'msw';

import { GRAPHQL_URL } from '@/shared/config/env';
import { gqlError, gqlOk, graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { ApiError, FORBIDDEN_CODES } from './errors';
import { gqlRequest } from './graphql-client';
import { PingDocument } from './ping';
import { registerSessionHooks, resetSessionHooks } from './session';

describe('gqlRequest', () => {
  afterEach(() => resetSessionHooks());

  it('Bearer 토큰과 X-Client: mobile을 붙여 보내고 data를 돌려준다(쿠키 없음)', async () => {
    registerSessionHooks({ getAccessToken: () => 'tok-1' });
    let auth: string | null = null;
    let xClient: string | null = null;
    let credentials: RequestCredentials | undefined;
    server.use(
      graphql.query('Ping', ({ request }) => {
        auth = request.headers.get('authorization');
        xClient = request.headers.get('x-client');
        credentials = request.credentials;
        return HttpResponse.json({ data: { ping: 'pong' } });
      }),
    );
    const data = await gqlRequest(PingDocument);
    expect(data.ping).toBe('pong');
    expect(auth).toBe('Bearer tok-1');
    expect(xClient).toBe('mobile');
    expect(credentials).not.toBe('include');
  });

  it('토큰이 없으면 Authorization 헤더를 붙이지 않는다', async () => {
    let auth: string | null = 'unset';
    server.use(
      graphql.query('Ping', ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json({ data: { ping: 'pong' } });
      }),
    );
    await gqlRequest(PingDocument);
    expect(auth).toBeNull();
  });

  it('errors[]는 ApiError(code·classification)로 바뀐다', async () => {
    server.use(
      gqlError('Ping', {
        message: '매장 없음',
        code: 'STORE_NOT_FOUND',
        classification: 'NOT_FOUND',
        statusCode: 404,
      }),
    );
    const err = await gqlRequest(PingDocument).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      code: 'STORE_NOT_FOUND',
      classification: 'NOT_FOUND',
      status: 404,
    });
  });

  describe('403 세션 분기', () => {
    it.each(FORBIDDEN_CODES)('%s는 onForbidden을 한 번 부르고 던진다', async (code) => {
      const onForbidden = jest.fn();
      registerSessionHooks({ onForbidden });
      server.use(
        gqlError('Ping', { message: '금지', code, classification: 'FORBIDDEN', statusCode: 403 }),
      );
      await expect(gqlRequest(PingDocument)).rejects.toMatchObject({
        code,
        classification: 'FORBIDDEN',
      });
      expect(onForbidden).toHaveBeenCalledTimes(1);
      expect(onForbidden).toHaveBeenCalledWith(code);
    });

    it.each([
      ['다른 코드의 FORBIDDEN', 'STORE_NOT_FOUND', 'FORBIDDEN', 403],
      ['코드 없는 FORBIDDEN', null, 'FORBIDDEN', 403],
      ['같은 코드지만 분류가 다름', 'ACCOUNT_NOT_ACTIVE', 'UNAUTHENTICATED', 401],
    ] as const)(
      '반증: %s이면 onForbidden을 부르지 않는다',
      async (_, code, classification, status) => {
        const onForbidden = jest.fn();
        registerSessionHooks({ onForbidden });
        server.use(
          gqlError('Ping', {
            message: 'x',
            code: code ?? undefined,
            classification,
            statusCode: status,
          }),
        );
        await expect(gqlRequest(PingDocument)).rejects.toBeInstanceOf(ApiError);
        expect(onForbidden).not.toHaveBeenCalled();
      },
    );
  });

  it('UNAUTHENTICATED면 refresh 1회 뒤 재시도한다', async () => {
    let refreshed = 0;
    registerSessionHooks({
      getAccessToken: () => (refreshed ? 'new' : 'old'),
      refresh: () => {
        refreshed += 1;
        return Promise.resolve(true);
      },
    });
    const seen: string[] = [];
    server.use(
      graphql.query('Ping', ({ request }) => {
        seen.push(request.headers.get('authorization') ?? '');
        if (seen.length === 1) {
          return HttpResponse.json({
            data: null,
            errors: [
              graphqlError({
                message: '만료',
                code: 'AUTHENTICATION_REQUIRED',
                classification: 'UNAUTHENTICATED',
                statusCode: 401,
              }),
            ],
          });
        }
        return HttpResponse.json({ data: { ping: 'pong' } });
      }),
    );
    const data = await gqlRequest(PingDocument);
    expect(data.ping).toBe('pong');
    expect(refreshed).toBe(1);
    expect(seen).toEqual(['Bearer old', 'Bearer new']);
  });

  it('refresh가 실패하면 UNAUTHENTICATED ApiError를 던지고 재시도하지 않는다', async () => {
    let calls = 0;
    server.use(
      graphql.query('Ping', () => {
        calls += 1;
        return HttpResponse.json({
          data: null,
          errors: [
            graphqlError({ message: '만료', classification: 'UNAUTHENTICATED', statusCode: 401 }),
          ],
        });
      }),
    );
    await expect(gqlRequest(PingDocument)).rejects.toMatchObject({
      classification: 'UNAUTHENTICATED',
    });
    expect(calls).toBe(1);
  });

  it('HTTP 401에 본문이 없어도 UNAUTHENTICATED로 분류한다', async () => {
    server.use(http.post(GRAPHQL_URL, () => new HttpResponse(null, { status: 401 })));
    await expect(gqlRequest(PingDocument)).rejects.toMatchObject({
      classification: 'UNAUTHENTICATED',
      status: 401,
    });
  });

  it.each([
    [400, 'BAD_USER_INPUT', 400],
    [200, 'INTERNAL_SERVER_ERROR', 500],
    [500, 'INTERNAL_SERVER_ERROR', 500],
  ] as const)(
    'extensions 없는 errors[]는 HTTP %d에서 %s로 분류한다',
    async (httpStatus, classification, status) => {
      server.use(
        http.post(GRAPHQL_URL, () =>
          HttpResponse.json(
            { errors: [{ message: 'Variable "$input" got invalid value' }] },
            { status: httpStatus },
          ),
        ),
      );
      await expect(gqlRequest(PingDocument)).rejects.toMatchObject({
        classification,
        code: null,
        status,
      });
    },
  );

  it('data 없는 5xx는 INTERNAL_SERVER_ERROR', async () => {
    server.use(http.post(GRAPHQL_URL, () => HttpResponse.json({}, { status: 502 })));
    await expect(gqlRequest(PingDocument)).rejects.toMatchObject({
      classification: 'INTERNAL_SERVER_ERROR',
      status: 502,
    });
  });

  it('네트워크 실패는 NETWORK', async () => {
    server.use(http.post(GRAPHQL_URL, () => HttpResponse.error()));
    await expect(gqlRequest(PingDocument)).rejects.toMatchObject({ classification: 'NETWORK' });
  });

  it('gqlOk 헬퍼는 operation 이름으로 응답한다', async () => {
    server.use(gqlOk('Ping', { ping: 'pong' }));
    await expect(gqlRequest(PingDocument)).resolves.toEqual({ ping: 'pong' });
  });
});
