import { renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../../app/_layout';
import Index from '../../app/index';

/** 라우터·NativeWind·RNTL 14가 jest에서 함께 도는지 — app/ 안에는 spec을 못 두므로 여기서 */
describe('앱 셸', () => {
  it('루트 Stack 안에 첫 화면이 뜬다', async () => {
    // RNTL 14의 render는 비동기인데 renderRouter(57)는 결과 Promise에 헬퍼를 얹어 돌려준다 — 먼저 기다린다
    const router = renderRouter({ _layout: RootLayout, index: Index }, { initialUrl: '/' });
    await router;
    expect(await screen.findByText('케이퀵 판매자')).toBeTruthy();
    expect(router.getPathname()).toBe('/');
  });
});
