import { type Client, createClient } from 'graphql-ws';
import { AppState, type NativeEventSubscription } from 'react-native';

import { type TypedDocumentString } from '@/graphql/generated/graphql';
import { env } from '@/shared/config/env';

import { ApiError } from './errors';
import { toApiError } from './graphql-client';
import { getSessionHooks, refreshOnce } from './session';

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const JITTER_MS = 1_000;
const KEEP_ALIVE_MS = 15_000;
/** graphql-ws 4401 Unauthorized(치명, 재시도 없음)·4403 Forbidden(재시도) — 둘 다 토큰을 갈아야 한다 */
const AUTH_CLOSE_CODES = new Set([4401, 4403]);

/** 1s·2s·4s…30s 상한 + 1s 안 지터. 테스트는 random을 주입한다 */
export function retryDelayMs(retries: number, random: () => number = Math.random): number {
  return Math.min(BASE_DELAY_MS * 2 ** retries, MAX_DELAY_MS) + Math.floor(random() * JITTER_MS);
}

function closeCode(event: unknown): number | null {
  return typeof event === 'object' && event !== null && 'code' in event ? Number(event.code) : null;
}

export function isAuthClose(event: unknown): boolean {
  const code = closeCode(event);
  return code !== null && AUTH_CLOSE_CODES.has(code);
}

let client: Client | null = null;
let appState: NativeEventSubscription | null = null;

/**
 * 앱 전체가 쓰는 graphql-ws 클라이언트 1개. lazy라 구독이 생길 때 연결하고 마지막 구독이 끝나면 닫는다.
 * connectionParams가 함수라 재연결마다 현재 토큰이 들어간다. 포그라운드 복귀 시 죽은 소켓을 끊어 재연결을 유도한다.
 */
export function getWsClient(): Client {
  if (client) return client;
  client = createClient({
    url: env.wsUrl,
    lazy: true,
    connectionParams: () => {
      const token = getSessionHooks().getAccessToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
    shouldRetry: () => true,
    retryAttempts: Number.POSITIVE_INFINITY,
    retryWait: (retries) => new Promise((resolve) => setTimeout(resolve, retryDelayMs(retries))),
    keepAlive: KEEP_ALIVE_MS,
    on: {
      closed: (event) => {
        if (isAuthClose(event)) void refreshOnce();
      },
    },
  });
  appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') client?.terminate();
  });
  return client;
}

/** 로그아웃·테스트용. 열린 구독을 모두 끝내고 다음 getWsClient가 새로 만든다. */
export function disposeWsClient(): void {
  void client?.dispose();
  appState?.remove();
  client = null;
  appState = null;
}

export interface SubscriptionSink<T> {
  next: (data: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
}

/**
 * 구독 1건. 반환값을 부르면 끊는다. 4401로 끊기면(토큰 만료 — graphql-ws는 재시도하지 않는다) refresh 1회 뒤 다시 구독한다.
 * 결과의 errors[]는 ApiError로 바꿔 sink.error에 준다. 캐시 갱신·워터마크 비교는 호출한 feature의 몫.
 */
export function subscribe<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  variables: TVariables | undefined,
  sink: SubscriptionSink<TResult>,
): () => void {
  let dispose: (() => void) | null = null;
  let disposed = false;
  let retried = false;
  const start = () => {
    dispose = getWsClient().subscribe<TResult>(
      { query: document.toString(), variables: variables as Record<string, unknown> | undefined },
      {
        next: (result) => {
          if (result.errors?.length) sink.error?.(toApiError(result.errors, 200));
          else if (result.data) sink.next(result.data);
        },
        error: (error) => {
          if (!retried && isAuthClose(error)) {
            retried = true;
            void refreshOnce().then((ok) => {
              if (disposed) return;
              if (ok) start();
              else
                sink.error?.(new ApiError('세션이 만료되었습니다.', 'UNAUTHENTICATED', null, 401));
            });
            return;
          }
          sink.error?.(error);
        },
        complete: () => sink.complete?.(),
      },
    );
  };
  start();
  return () => {
    disposed = true;
    dispose?.();
  };
}
