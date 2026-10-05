import { type ClientOptions, type Sink, createClient } from 'graphql-ws';
import { AppState } from 'react-native';

import { ApiError } from './errors';
import { PingDocument } from './ping';
import { registerSessionHooks, resetSessionHooks } from './session';
import { disposeWsClient, getWsClient, isAuthClose, retryDelayMs, subscribe } from './ws-client';

type FakeSink = Sink<{ data?: unknown; errors?: { message: string }[] }>;

/** createClient를 가짜로 — 옵션과 구독 sink를 붙잡아 이벤트를 직접 흘린다 */
const mockWs = {
  options: null as ClientOptions | null,
  sinks: [] as FakeSink[],
  payloads: [] as unknown[],
  dispose: jest.fn(),
  terminate: jest.fn(),
  unsubscribe: jest.fn(),
};
jest.mock('graphql-ws', () => ({
  createClient: jest.fn((options: ClientOptions) => {
    mockWs.options = options;
    return {
      on: jest.fn(),
      subscribe: jest.fn((payload: unknown, sink: FakeSink) => {
        mockWs.payloads.push(payload);
        mockWs.sinks.push(sink);
        return mockWs.unsubscribe;
      }),
      iterate: jest.fn(),
      dispose: mockWs.dispose,
      terminate: mockWs.terminate,
    };
  }),
}));

/** refreshOnce의 finally·then 체인을 끝까지 흘린다 */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const errorSink = () => jest.fn((_error: unknown) => undefined);
const closeEvent = (code: number) => ({ code, reason: '' });
const appStateHandler = (): ((state: string) => void) => {
  const call = jest.mocked(AppState.addEventListener).mock.calls.at(-1);
  return call![1] as (state: string) => void;
};

describe('retryDelayMs', () => {
  it.each([
    [0, 1000],
    [1, 2000],
    [3, 8000],
    [5, 30000],
    [20, 30000],
  ])('%d회째 재시도는 지터 0에서 %dms', (retries, base) => {
    expect(retryDelayMs(retries, () => 0)).toBe(base);
  });

  it('지터는 1초 미만을 더한다', () => {
    expect(retryDelayMs(0, () => 0.999)).toBe(1999);
    expect(retryDelayMs(0, () => 0.5)).toBe(1500);
  });
});

describe('isAuthClose', () => {
  it.each([
    [closeEvent(4401), true],
    [closeEvent(4403), true],
    [closeEvent(1000), false],
    [closeEvent(4499), false],
    [new Error('x'), false],
    [null, false],
  ])('%p → %s', (event, expected) => {
    expect(isAuthClose(event)).toBe(expected);
  });
});

describe('ws client', () => {
  beforeEach(() => {
    mockWs.options = null;
    mockWs.sinks = [];
    mockWs.payloads = [];
    jest.clearAllMocks();
  });
  afterEach(() => {
    disposeWsClient();
    resetSessionHooks();
  });

  it('getWsClient 전에는 만들지 않고, 만든 뒤에는 같은 클라이언트를 돌려준다', () => {
    expect(createClient).not.toHaveBeenCalled();
    const a = getWsClient();
    const b = getWsClient();
    expect(a).toBe(b);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(mockWs.options).toMatchObject({
      lazy: true,
      keepAlive: 15000,
      url: 'ws://localhost:4100/graphql',
    });
  });

  it('connectionParams는 현재 토큰을 Bearer로, 없으면 빈 객체', async () => {
    getWsClient();
    const params = mockWs.options!.connectionParams as () => Record<string, string>;
    expect(params()).toEqual({});
    registerSessionHooks({ getAccessToken: () => 'tok' });
    expect(params()).toEqual({ authorization: 'Bearer tok' });
    await expect(mockWs.options!.retryWait!(0)).resolves.toBeUndefined();
    expect(mockWs.options!.shouldRetry!(closeEvent(1006))).toBe(true);
  });

  it.each([
    [4401, 1],
    [4403, 1],
    [1006, 0],
    [4499, 0],
  ])('closed %d → refresh %d회', (code, calls) => {
    const refresh = jest.fn(() => Promise.resolve(true));
    registerSessionHooks({ refresh });
    getWsClient();
    mockWs.options!.on!.closed!(closeEvent(code));
    expect(refresh).toHaveBeenCalledTimes(calls);
  });

  it('포그라운드 복귀(active)에만 terminate한다', () => {
    getWsClient();
    const handler = appStateHandler();
    handler('background');
    handler('inactive');
    expect(mockWs.terminate).not.toHaveBeenCalled();
    handler('active');
    expect(mockWs.terminate).toHaveBeenCalledTimes(1);
  });

  it('dispose하면 AppState 리스너를 떼고 다음에는 새로 만든다', () => {
    getWsClient();
    const sub = jest.mocked(AppState.addEventListener).mock.results[0]!.value as {
      remove: jest.Mock;
    };
    disposeWsClient();
    expect(mockWs.dispose).toHaveBeenCalledTimes(1);
    expect(sub.remove).toHaveBeenCalledTimes(1);
    getWsClient();
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  describe('subscribe', () => {
    it('문서 문자열·변수를 보내고 data를 next로, errors[]는 ApiError로 준다', () => {
      const next = jest.fn();
      const error = errorSink();
      const stop = subscribe(PingDocument, undefined, { next, error });
      expect(mockWs.payloads[0]).toEqual({ query: String(PingDocument), variables: undefined });
      mockWs.sinks[0]!.next({ data: { ping: 'pong' } });
      mockWs.sinks[0]!.next({
        data: null,
        errors: [
          {
            message: '매장 없음',
            extensions: { code: 'STORE_NOT_FOUND', classification: 'NOT_FOUND', statusCode: 404 },
          },
        ],
      } as never);
      expect(next).toHaveBeenCalledWith({ ping: 'pong' });
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0]![0]).toBeInstanceOf(ApiError);
      expect(error.mock.calls[0]![0]).toMatchObject({ code: 'STORE_NOT_FOUND', status: 404 });
      stop();
      expect(mockWs.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('4401로 끊기면 refresh 뒤 한 번 다시 구독한다', async () => {
      const refresh = jest.fn(() => Promise.resolve(true));
      registerSessionHooks({ refresh });
      const error = errorSink();
      subscribe(PingDocument, undefined, { next: jest.fn(), error });
      mockWs.sinks[0]!.error(closeEvent(4401));
      await flush();
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(mockWs.sinks).toHaveLength(2);
      expect(error).not.toHaveBeenCalled();

      // 반증: 두 번째 4401은 더 재구독하지 않고 그대로 넘긴다
      mockWs.sinks[1]!.error(closeEvent(4401));
      await flush();
      expect(mockWs.sinks).toHaveLength(2);
      expect(error).toHaveBeenCalledWith(closeEvent(4401));
    });

    it('refresh가 실패하면 UNAUTHENTICATED ApiError를 주고 재구독하지 않는다', async () => {
      registerSessionHooks({ refresh: () => Promise.resolve(false) });
      const error = errorSink();
      subscribe(PingDocument, undefined, { next: jest.fn(), error });
      mockWs.sinks[0]!.error(closeEvent(4401));
      await flush();
      expect(mockWs.sinks).toHaveLength(1);
      expect(error.mock.calls[0]![0]).toMatchObject({ classification: 'UNAUTHENTICATED' });
    });

    it('반증: 끊은 뒤 도착한 4401은 재구독하지 않는다', async () => {
      const refresh = jest.fn(() => Promise.resolve(true));
      registerSessionHooks({ refresh });
      const stop = subscribe(PingDocument, undefined, { next: jest.fn() });
      stop();
      mockWs.sinks[0]!.error(closeEvent(4401));
      await flush();
      expect(mockWs.sinks).toHaveLength(1);
    });

    it('4401이 아닌 오류와 complete는 그대로 넘긴다', () => {
      const error = errorSink();
      const complete = jest.fn();
      subscribe(PingDocument, undefined, { next: jest.fn(), error, complete });
      mockWs.sinks[0]!.error(new Error('boom'));
      mockWs.sinks[0]!.complete();
      expect(error).toHaveBeenCalledWith(new Error('boom'));
      expect(complete).toHaveBeenCalledTimes(1);
    });
  });
});
