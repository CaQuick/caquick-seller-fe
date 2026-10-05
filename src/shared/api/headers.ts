import { getSessionHooks } from './session';

/** 쿠키 없는 모바일 클라이언트 표식 — BE가 refresh 토큰을 Set-Cookie 대신 바디로 준다. */
export const X_CLIENT = 'mobile';

export function requestHeaders(withAuth: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-client': X_CLIENT,
  };
  if (withAuth) {
    const token = getSessionHooks().getAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }
  return headers;
}
