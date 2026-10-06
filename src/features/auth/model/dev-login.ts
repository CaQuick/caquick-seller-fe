import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import { ApiError, messageFor, sellerAuthApi } from '@/shared/api';

import { REFRESH_TOKEN_KEY } from './session';
import { useSessionStore } from './session-store';

export const DEV_LOGIN_COPY = {
  title: '개발용 로그인',
  description:
    '계정 ID로 테스트 토큰을 받아 로그인해요.\n앱을 다시 켜거나 토큰이 만료되면 로그아웃돼요',
  label: '계정 ID',
  submit: '테스트 로그인',
  devOnly: '연결된 서버가 운영 환경이라 개발용 로그인을 쓸 수 없어요',
} as const;

export const accountIdSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{0,18}$/, '계정 ID는 숫자로 입력해 주세요');

const SECRET_TAPS = 5;
/** 이 간격을 넘기면 처음부터 다시 센다 */
export const SECRET_TAP_GAP_MS = 1000;

export interface TapState {
  count: number;
  at: number;
}

/** 로고 연속 탭을 센다. 목표 횟수에 닿으면 0으로 돌린다 */
export function countTap(prev: TapState, now: number): { next: TapState; open: boolean } {
  const count = now - prev.at <= SECRET_TAP_GAP_MS ? prev.count + 1 : 1;
  const open = count >= SECRET_TAPS;
  return { next: { count: open ? 0 : count, at: now }, open };
}

export function devLoginMessage(error: unknown): string {
  return error instanceof ApiError && error.code === 'DEV_ONLY_ENDPOINT'
    ? DEV_LOGIN_COPY.devOnly
    : messageFor(error);
}

/** refresh 토큰이 없어 메모리 세션만 둔다 — 만료·재실행이면 로그인 화면으로 돌아간다 */
export async function devLogin(accountId: string): Promise<void> {
  const res = await sellerAuthApi.devIssueToken(accountId);
  // 남은 refresh 토큰이 있으면 만료 때 다른 계정 세션으로 갱신된다
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  useSessionStore.getState().setSession({
    accessToken: res.accessToken,
    expiresInSeconds: res.expiresInSeconds,
    mustChangePassword: false,
  });
}
