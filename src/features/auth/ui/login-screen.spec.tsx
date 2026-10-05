import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { HttpResponse, http } from 'msw';

import { resetSessionHooks } from '@/shared/api';
import { AUTH_URL } from '@/shared/config/env';
import { mockSecureStore } from '@/test/mocks';
import { restError, restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { installSessionHooks } from '../model/session';
import { useSessionStore } from '../model/session-store';
import { LoginScreen } from './login-screen';

const session = (mustChangePassword = false) => ({
  accessToken: 'at',
  tokenType: 'Bearer' as const,
  accountStatus: 'ACTIVE' as const,
  mustChangePassword,
  refreshToken: 'rt',
  refreshExpiresAt: '2026-11-05T00:00:00.000Z',
});

/** RNTL 14의 render는 비동기인데 renderRouter는 결과 Promise에 헬퍼를 얹는다 — async 함수로 감싸면 풀려 버려 그대로 돌려준다 */
function open() {
  return renderRouter(
    { login: LoginScreen, index: () => null, 'change-password': () => null },
    { initialUrl: '/login' },
  );
}

async function submit(username: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('아이디'), username);
  await fireEvent.changeText(screen.getByLabelText('비밀번호'), password);
  await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
}

describe('LoginScreen', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'anonymous', accessToken: null, mustChangePassword: false });
    installSessionHooks();
  });
  afterEach(() => resetSessionHooks());

  it('형식이 틀리면 서버를 부르지 않고 필드 오류를 보여준다', async () => {
    let called = 0;
    server.use(
      http.post(`${AUTH_URL}/seller/login`, () => {
        called += 1;
        return HttpResponse.json(session());
      }),
    );
    const router = open();
    await router;
    await submit('ab', 'short');
    expect(await screen.findByText('아이디는 4자 이상입니다.')).toBeTruthy();
    expect(screen.getByText('비밀번호는 8자 이상입니다.')).toBeTruthy();
    expect(called).toBe(0);
    expect(router.getPathname()).toBe('/login');
  });

  it('성공하면 refreshToken을 SecureStore에 두고 홈으로 간다', async () => {
    server.use(restOk('/seller/login', session()));
    const router = open();
    await router;
    await submit('seller01', 'Password1!');
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'at',
    });
    expect(mockSecureStore.get('caquick.refreshToken')).toBe('rt');
  });

  it('비밀번호 변경이 강제된 계정은 변경 화면으로 간다', async () => {
    server.use(restOk('/seller/login', session(true)));
    const router = open();
    await router;
    await submit('seller01', 'Password1!');
    await waitFor(() => expect(router.getPathname()).toBe('/change-password'));
  });

  it('자격증명이 틀리면 한국어 오류를 보여주고 세션은 그대로다', async () => {
    server.use(restError('/seller/login', 401, 'Invalid credentials', 'INVALID_CREDENTIALS'));
    const router = open();
    await router;
    await submit('seller01', 'Password1!');
    expect(await screen.findByText('아이디 또는 비밀번호가 올바르지 않습니다.')).toBeTruthy();
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
    expect(router.getPathname()).toBe('/login');
  });
});
