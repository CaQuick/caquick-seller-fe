import type { ConfigContext } from 'expo/config';

import appConfig from '../../app.config';

// iOS 27 SDK 빌드는 UIScene 생명주기가 없으면 실행 직후 종료된다. 다른 게이트(lint·tsc·export·doctor)는
// config plugin을 돌리지 않아 옵션이 빠져도 통과하므로, 15분짜리 iOS 빌드 전에 여기서 막는다.
describe('app.config', () => {
  it('expo-build-properties로 iOS UIScene 생명주기를 켠다', () => {
    const { plugins = [] } = appConfig({ config: {} } as ConfigContext);
    const entry = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-build-properties');
    const options = (
      entry as [string, { ios?: { enableSceneSupport?: boolean } }] | undefined
    )?.[1];

    expect(options?.ios?.enableSceneSupport).toBe(true);
  });
});
