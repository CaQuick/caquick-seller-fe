import { type TypedDocumentString } from '@/graphql/generated/graphql';
import { GRAPHQL_URL } from '@/shared/config/env';

import { ApiError, type ErrorClassification, classifyStatus, isForbiddenCode } from './errors';
import { requestHeaders } from './headers';
import { getSessionHooks, refreshOnce } from './session';

interface GraphQLErrorShape {
  message: string;
  extensions?: { code?: string | null; classification?: string; statusCode?: number };
}

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: GraphQLErrorShape[];
}

/** BE 필터를 거치지 않은 오류(Apollo 변수·문서 검증 등)는 extensions가 비어 HTTP status로 분류한다. */
export function toApiError(errors: readonly GraphQLErrorShape[], httpStatus: number): ApiError {
  const first = errors[0];
  const ext = first?.extensions ?? {};
  const status = ext.statusCode ?? (httpStatus >= 400 ? httpStatus : 500);
  return new ApiError(
    first?.message ?? 'GraphQL 오류',
    (ext.classification as ErrorClassification | undefined) ?? classifyStatus(status),
    ext.code ?? null,
    status,
  );
}

async function send<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  variables: TVariables | undefined,
): Promise<{ status: number; body: GraphQLResponse<TResult> | null }> {
  let res: Response;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: requestHeaders(true),
      body: JSON.stringify({ query: document.toString(), variables }),
    });
  } catch {
    throw new ApiError('네트워크 오류', 'NETWORK', null, 0);
  }
  const body = (await res.json().catch(() => null)) as GraphQLResponse<TResult> | null;
  return { status: res.status, body };
}

/**
 * GraphQL 요청 1건. 쿠키 없음, X-Client: mobile.
 * 인증 만료(HTTP 401 또는 errors.classification=UNAUTHENTICATED)면 refresh 1회 뒤 재시도, 그래도 실패면 ApiError(UNAUTHENTICATED).
 * 세션 상태를 바꾸는 403 코드(비밀번호 변경 필요·정지·계정 유형)는 onForbidden을 한 번 부른 뒤 던진다 — 화면은 문구만 보여 준다.
 */
export async function gqlRequest<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never> ? [] : [TVariables]
): Promise<TResult> {
  let { status, body } = await send(document, variables);
  const unauthenticated = (): boolean =>
    status === 401 || (body?.errors?.[0]?.extensions?.classification ?? '') === 'UNAUTHENTICATED';
  if (unauthenticated() && (await refreshOnce())) {
    ({ status, body } = await send(document, variables));
  }
  if (body?.errors?.length) {
    const error = toApiError(body.errors, status);
    if (error.classification === 'FORBIDDEN' && isForbiddenCode(error.code)) {
      getSessionHooks().onForbidden(error.code);
    }
    throw error;
  }
  if (!body?.data) {
    throw new ApiError(
      `GraphQL 응답 오류 (${status})`,
      status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL_SERVER_ERROR',
      null,
      status,
    );
  }
  return body.data;
}
