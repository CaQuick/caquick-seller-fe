import { GRAPHQL_URL } from '@/shared/config/env';
import { gqlError, gqlOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { PingDocument } from './ping';

/** 테스트 인프라 자체의 스모크 — jest-expo 환경에서 fetch가 MSW 핸들러에 닿는지 */
async function post(document: string) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: document, operationName: 'Ping' }),
  });
  return res.json() as Promise<{ data?: { ping: string }; errors?: { message: string }[] }>;
}

describe('ping 문서', () => {
  it('codegen이 만든 문서 문자열로 MSW 성공 응답을 받는다', async () => {
    server.use(gqlOk('Ping', { ping: 'pong' }));
    expect(String(PingDocument)).toContain('query Ping');
    await expect(post(String(PingDocument))).resolves.toEqual({ data: { ping: 'pong' } });
  });

  it('반증: 같은 operation의 에러 핸들러는 BE 모양(200 + errors[])으로 돌려준다', async () => {
    server.use(gqlError('Ping', { message: '점검 중', classification: 'INTERNAL_SERVER_ERROR' }));
    const body = await post(String(PingDocument));
    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.message).toBe('점검 중');
  });
});
