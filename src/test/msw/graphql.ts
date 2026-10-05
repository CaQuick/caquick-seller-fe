import { HttpResponse, graphql, http } from 'msw';

import { AUTH_URL } from '@/shared/config/env';

interface GraphQLErrorInput {
  message: string;
  code?: string;
  classification: string;
  statusCode?: number;
}

/** BE graphql-exception.filter가 만드는 모양 그대로. */
export function graphqlError({ message, code, classification, statusCode }: GraphQLErrorInput) {
  return {
    message,
    extensions: { code: code ?? null, classification, statusCode: statusCode ?? 500 },
  };
}

/** operation 이름으로 성공 응답을 돌려주는 핸들러. */
export function gqlOk<T extends Record<string, unknown>>(operation: string, data: T) {
  return graphql.query(operation, () => HttpResponse.json({ data }));
}
/** 에러 응답(HTTP 200 + errors[]) — BE는 GraphQL 에러를 200으로 준다. */
export function gqlError(operation: string, error: GraphQLErrorInput) {
  return graphql.operation(({ operationName }) =>
    operationName === operation
      ? HttpResponse.json({ data: null, errors: [graphqlError(error)] })
      : undefined,
  );
}

/** REST 에러 envelope(ApiResponseTemplate.ERROR). */
export function restError(
  path: string,
  status: number,
  message: string,
  errorCode: string | null = null,
) {
  return http.post(`${AUTH_URL}${path}`, () =>
    HttpResponse.json({ message, code: status, data: null, errorCode }, { status }),
  );
}
export function restOk<T>(path: string, body: T, status = 200) {
  return http.post(`${AUTH_URL}${path}`, () =>
    status === 204
      ? new HttpResponse(null, { status })
      : HttpResponse.json(body as Record<string, unknown>, { status }),
  );
}
