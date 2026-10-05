import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { useSessionStore } from '@/features/auth';
import { mockSecureStore } from '@/test/mocks';
import { restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { SettingsScreen } from './settings-screen';

function open() {
  return renderRouter(
    { 'settings/index': SettingsScreen, 'settings/change-password': () => null },
    { initialUrl: '/settings' },
  );
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: 'authenticated',
      accessToken: 'at',
      mustChangePassword: false,
    });
    mockSecureStore.set('caquick.refreshToken', 'rt');
  });

  it('비밀번호 변경 화면으로 이동한다', async () => {
    const router = open();
    await router;
    await fireEvent.press(screen.getByRole('link', { name: /비밀번호 변경/ }));
    await waitFor(() => expect(router.getPathname()).toBe('/settings/change-password'));
  });

  it('로그아웃하면 서버 세션을 끝내고 로컬 세션을 비운다', async () => {
    server.use(restOk('/seller/logout', null, 204));
    await open();
    await fireEvent.press(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(useSessionStore.getState().status).toBe('anonymous'));
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
  });
});
