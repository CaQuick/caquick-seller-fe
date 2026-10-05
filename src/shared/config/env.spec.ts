import { parseEnv } from './env';

describe('환경 변수 검증', () => {
  it('http API·ws 구독 주소를 읽고 끝 슬래시를 뗀다', () => {
    expect(
      parseEnv({
        EXPO_PUBLIC_API_BASE_URL: 'https://api.caquick.site/',
        EXPO_PUBLIC_WS_URL: 'wss://api.caquick.site/graphql',
      }),
    ).toEqual({ apiBaseUrl: 'https://api.caquick.site', wsUrl: 'wss://api.caquick.site/graphql' });
  });

  it.each([
    ['API 주소 없음', { EXPO_PUBLIC_WS_URL: 'ws://localhost:4100/graphql' }],
    [
      'API 주소가 ws',
      { EXPO_PUBLIC_API_BASE_URL: 'ws://x', EXPO_PUBLIC_WS_URL: 'ws://localhost:4100/graphql' },
    ],
    [
      '구독 주소가 http',
      { EXPO_PUBLIC_API_BASE_URL: 'http://localhost:4100', EXPO_PUBLIC_WS_URL: 'http://x' },
    ],
    ['URL이 아님', { EXPO_PUBLIC_API_BASE_URL: 'localhost', EXPO_PUBLIC_WS_URL: 'graphql' }],
  ])('반증: %s이면 부팅 시점에 던진다', (_label, raw) => {
    expect(() => parseEnv(raw)).toThrow('환경 변수가 잘못됐다');
  });
});
