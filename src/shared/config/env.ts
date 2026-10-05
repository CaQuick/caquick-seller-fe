import { z } from 'zod';

// EXPO_PUBLIC_*는 번들 시점에 박히므로 process.env.<이름>을 글자 그대로 읽어야 한다(동적 접근 금지).
const schema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z
    .url({ protocol: /^https?$/, error: 'EXPO_PUBLIC_API_BASE_URL은 http(s) URL이어야 한다' })
    .transform((v) => v.replace(/\/$/, '')),
  EXPO_PUBLIC_WS_URL: z.url({
    protocol: /^wss?$/,
    error: 'EXPO_PUBLIC_WS_URL은 ws(s) URL이어야 한다',
  }),
});

export function parseEnv(raw: Record<string, string | undefined>) {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`환경 변수가 잘못됐다 — ${detail}`);
  }
  return {
    apiBaseUrl: result.data.EXPO_PUBLIC_API_BASE_URL,
    wsUrl: result.data.EXPO_PUBLIC_WS_URL,
  };
}

export const env = parseEnv({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
});

export const GRAPHQL_URL = `${env.apiBaseUrl}/graphql`;
export const AUTH_URL = `${env.apiBaseUrl}/auth`;
