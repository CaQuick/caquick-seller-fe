import { AUTH_URL } from '@/shared/config/env';

import { ApiError, type FieldErrors, classifyStatus } from './errors';
import { requestHeaders } from './headers';
import { refreshOnce } from './session';

/** BE REST 에러 envelope(ApiResponseTemplate.ERROR). 로그인 성공 응답은 envelope 없이 본문 그대로다. */
interface RestErrorBody {
  message?: string;
  code?: number;
  errorCode?: string | null;
  /** ValidationPipe 400만 채운다: 필드별 위반 목록 */
  data?: { property: string; constraints: Record<string, string> }[] | null;
}

export interface RestOptions {
  body?: unknown;
  /** true면 Authorization 헤더를 붙인다(비밀번호 변경 등). 로그인·refresh·logout은 바디의 refreshToken만 쓴다. */
  auth?: boolean;
}

/**
 * 401이지만 입력 오류라 refresh 대상이 아닌 코드. 그 밖의 401(토큰 만료, 계정 소멸 등)은 GraphQL과 같이 refresh를 1회 시도한다 —
 * 세션이 끝났으면 refresh 실패로 auth가 스토어를 비워 로그인 화면으로 보낸다.
 */
const INPUT_ERROR_CODES = new Set(['CURRENT_PASSWORD_INVALID']);

/** validation data[] → { 필드: 첫 위반 문구 }. 위반 문구가 없으면 BE message. */
export function toFieldErrors(body: RestErrorBody | null): FieldErrors | null {
  if (!Array.isArray(body?.data) || body.data.length === 0) return null;
  const map: FieldErrors = {};
  for (const { property, constraints } of body.data) {
    map[property] ??=
      Object.values(constraints)[0] ?? body.message ?? '입력값이 올바르지 않습니다.';
  }
  return map;
}

async function send(
  path: string,
  options: RestOptions,
): Promise<{ status: number; body: RestErrorBody | null }> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_URL}${path}`, {
      method: 'POST',
      headers: requestHeaders(options.auth === true),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('네트워크 오류', 'NETWORK', null, 0);
  }
  if (res.status === 204) return { status: 204, body: null };
  return { status: res.status, body: (await res.json().catch(() => null)) as RestErrorBody | null };
}

/**
 * `/auth/*` REST 호출. 쿠키 없음, 모든 요청에 X-Client: mobile.
 * `auth: true` 요청이 입력 오류가 아닌 401이면 refresh 1회 뒤 재시도한다. 로그인·refresh 자체는 결과를 auth feature가 해석한다.
 */
export async function authRequest<T>(path: string, options: RestOptions = {}): Promise<T> {
  let { status, body } = await send(path, options);
  if (
    options.auth &&
    status === 401 &&
    !INPUT_ERROR_CODES.has(body?.errorCode ?? '') &&
    (await refreshOnce())
  ) {
    ({ status, body } = await send(path, options));
  }
  if (status === 204) return undefined as T;
  if (status < 200 || status >= 300) {
    throw new ApiError(
      body?.message ?? `요청 실패 (${status})`,
      classifyStatus(status),
      body?.errorCode ?? null,
      status,
      status === 400 ? toFieldErrors(body) : null,
    );
  }
  return body as T;
}

/** 로그인·refresh 응답(X-Client: mobile). refreshToken은 SecureStore에만 둔다. */
export interface CredentialSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  accountStatus: string;
  mustChangePassword: boolean;
  refreshToken: string;
  refreshExpiresAt: string;
}

export const sellerAuthApi = {
  login: (body: { username: string; password: string }) =>
    authRequest<CredentialSession>('/seller/login', { body }),
  refresh: (refreshToken: string) =>
    authRequest<CredentialSession>('/seller/refresh', { body: { refreshToken } }),
  logout: (refreshToken: string) => authRequest<void>('/seller/logout', { body: { refreshToken } }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    authRequest<{ ok: boolean }>('/seller/change-password', { auth: true, body }),
};
