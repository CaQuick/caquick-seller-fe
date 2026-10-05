import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { HttpResponse, http } from 'msw';

import { resetSessionHooks } from '@/shared/api';
import { AUTH_URL } from '@/shared/config/env';
import { mockSecureStore } from '@/test/mocks';
import { restError, restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { installSessionHooks } from '../model/session';
import { useSessionStore } from '../model/session-store';
import { ChangePasswordScreen } from './change-password-screen';

/** RNTL 14의 render는 비동기인데 renderRouter는 결과 Promise에 헬퍼를 얹는다 — async 함수로 감싸면 풀려 버려 그대로 돌려준다 */
function open() {
  return renderRouter(
    { 'change-password': ChangePasswordScreen, login: () => null },
    { initialUrl: '/change-password' },
  );
}

async function submit(current: string, next: string, confirm: string) {
  await fireEvent.changeText(screen.getByLabelText('현재 비밀번호'), current);
  await fireEvent.changeText(screen.getByLabelText('새 비밀번호'), next);
  await fireEvent.changeText(screen.getByLabelText('새 비밀번호 확인'), confirm);
  await fireEvent.press(screen.getByRole('button', { name: '비밀번호 변경' }));
}

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: 'authenticated',
      accessToken: 'at',
      mustChangePassword: true,
    });
    mockSecureStore.set('caquick.refreshToken', 'rt');
    installSessionHooks();
  });
  afterEach(() => resetSessionHooks());

  it('강제 변경이면 안내 문구가 다르고, 약한 비밀번호·불일치를 필드별로 보여준다', async () => {
    await open();
    expect(screen.getByText('계속하려면 먼저 비밀번호를 바꿔야 합니다.')).toBeTruthy();
    await submit('Current1!', 'weakweak', 'other');
    expect(await screen.findByText('숫자를 1자 이상 넣어 주세요.')).toBeTruthy();
    expect(screen.getByText('새 비밀번호가 서로 다릅니다.')).toBeTruthy();
  });

  it('성공하면 로컬 세션을 비우고 로그인 화면으로 간다', async () => {
    let auth: string | null = null;
    server.use(
      http.post(`${AUTH_URL}/seller/change-password`, ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    const router = open();
    await router;
    await submit('Current1!', 'Newpass1!', 'Newpass1!');
    await waitFor(() => expect(router.getPathname()).toBe('/login'));
    expect(auth).toBe('Bearer at');
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
  });

  it('현재 비밀번호가 틀리면 refresh 없이 BE 메시지를 보여준다', async () => {
    let refreshed = 0;
    server.use(
      restError(
        '/seller/change-password',
        401,
        '현재 비밀번호가 올바르지 않습니다.',
        'CURRENT_PASSWORD_INVALID',
      ),
      http.post(`${AUTH_URL}/seller/refresh`, () => {
        refreshed += 1;
        return HttpResponse.json({});
      }),
    );
    const router = open();
    await router;
    await submit('Wrong1!!', 'Newpass1!', 'Newpass1!');
    expect(await screen.findByText('현재 비밀번호가 올바르지 않습니다.')).toBeTruthy();
    expect(refreshed).toBe(0);
    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(router.getPathname()).toBe('/change-password');
  });

  it('토큰이 만료되고 refresh까지 실패하면 폼 대신 로그인 화면으로 보낸다', async () => {
    server.use(
      restError('/seller/change-password', 401, '만료', 'INVALID_ACCESS_TOKEN'),
      restError('/seller/refresh', 401, '만료', 'INVALID_REFRESH_TOKEN'),
    );
    const router = open();
    await router;
    await submit('Current1!', 'Newpass1!', 'Newpass1!');
    await waitFor(() => expect(router.getPathname()).toBe('/login'));
    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', accessToken: null });
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('토큰 만료 401은 refresh로 받은 새 토큰으로 재시도해 성공한다', async () => {
    const auths: (string | null)[] = [];
    server.use(
      restOk('/seller/refresh', {
        accessToken: 'at2',
        tokenType: 'Bearer',
        accountStatus: 'ACTIVE',
        mustChangePassword: true,
        refreshToken: 'rt2',
        refreshExpiresAt: '2026-11-05T00:00:00.000Z',
      }),
      http.post(`${AUTH_URL}/seller/change-password`, ({ request }) => {
        auths.push(request.headers.get('authorization'));
        return auths.length === 1
          ? HttpResponse.json(
              { message: '만료', code: 401, data: null, errorCode: 'INVALID_ACCESS_TOKEN' },
              { status: 401 },
            )
          : HttpResponse.json({ ok: true });
      }),
    );
    const router = open();
    await router;
    await submit('Current1!', 'Newpass1!', 'Newpass1!');
    await waitFor(() => expect(router.getPathname()).toBe('/login'));
    expect(auths).toEqual(['Bearer at', 'Bearer at2']);
  });
});
