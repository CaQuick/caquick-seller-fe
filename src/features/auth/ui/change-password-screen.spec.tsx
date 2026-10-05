import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { HttpResponse, http } from 'msw';
import { BackHandler } from 'react-native';
import { toast } from 'sonner-native';

import { resetSessionHooks } from '@/shared/api';
import { AUTH_URL } from '@/shared/config/env';
import { mockSecureStore } from '@/test/mocks';
import { restError, restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { AUTH_COPY, SESSION_ENDED } from '../model/messages';
import { installSessionHooks } from '../model/session';
import { useSessionStore } from '../model/session-store';
import { ChangePasswordScreen } from './change-password-screen';

jest.mock('sonner-native', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

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
  await fireEvent.press(screen.getByRole('button', { name: '변경하기' }));
}

const BACK = { type: 'hardwareBackPress', timeStamp: 0 };

/** 등록된 하드웨어 뒤로가기 핸들러 중 이벤트를 삼키는(true) 것이 있는지 — 내비게이터 핸들러도 함께 등록된다 */
function consumesBack(spy: jest.SpiedFunction<typeof BackHandler.addEventListener>) {
  return spy.mock.calls.some(
    ([type, handler]) => type === 'hardwareBackPress' && handler(BACK) === true,
  );
}

function signedIn(mustChangePassword: boolean) {
  useSessionStore.setState({
    status: 'authenticated',
    accessToken: 'at',
    expiresAt: null,
    mustChangePassword,
  });
  mockSecureStore.set('caquick.refreshToken', 'rt');
}

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    signedIn(true);
    installSessionHooks();
    jest.mocked(toast.error).mockClear();
    jest.mocked(toast.success).mockClear();
  });
  afterEach(() => resetSessionHooks());

  it('강제 변경이면 안내 배너·다른 계정 로그인을 보여주고 하드웨어 뒤로가기를 막는다', async () => {
    const back = jest.spyOn(BackHandler, 'addEventListener');
    await open();
    expect(screen.getByText(AUTH_COPY.forcedChange)).toBeTruthy();
    expect(screen.getByRole('header', { name: '비밀번호 변경' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '다른 계정으로 로그인' })).toBeTruthy();
    expect(consumesBack(back)).toBe(true);
    back.mockRestore();
  });

  it('설정에서 들어오면 배너·다른 계정 로그인 없이 뒤로가기를 막지 않는다', async () => {
    signedIn(false);
    const back = jest.spyOn(BackHandler, 'addEventListener');
    await open();
    expect(screen.queryByText(AUTH_COPY.forcedChange)).toBeNull();
    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.queryByRole('button', { name: '다른 계정으로 로그인' })).toBeNull();
    expect(consumesBack(back)).toBe(false);
    back.mockRestore();
  });

  it('규칙 안내를 보여주다가 약한 비밀번호·불일치는 같은 자리에 오류로 바꾼다', async () => {
    await open();
    expect(screen.getByText(AUTH_COPY.passwordRule)).toBeTruthy();
    await submit('Current1!', 'weakweak', 'other');
    expect(await screen.findByText('숫자를 1자 이상 넣어 주세요.')).toBeTruthy();
    expect(screen.queryByText(AUTH_COPY.passwordRule)).toBeNull();
    expect(screen.getByText('새 비밀번호가 서로 다릅니다.')).toBeTruthy();
  });

  it('성공하면 로컬 세션을 비우고 변경 완료 토스트와 함께 로그인 화면으로 간다', async () => {
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
    expect(toast.success).toHaveBeenCalledWith(AUTH_COPY.passwordChanged);
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
  });

  it('현재 비밀번호가 틀리면 refresh 없이 그 칸 아래에 오류를 보여준다', async () => {
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
    expect(await screen.findByText('현재 비밀번호가 일치하지 않습니다.')).toBeTruthy();
    expect(refreshed).toBe(0);
    expect(toast.error).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(router.getPathname()).toBe('/change-password');
  });

  it('칸을 짚지 않는 오류는 토스트로 알린다', async () => {
    server.use(restError('/seller/change-password', 500, 'boom'));
    await open();
    await submit('Current1!', 'Newpass1!', 'Newpass1!');
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      ),
    );
  });

  it('정지된 계정이면 세션 훅이 정리·안내하고 화면은 같은 안내를 반복하지 않는다', async () => {
    server.use(restError('/seller/change-password', 403, '정지', 'ACCOUNT_NOT_ACTIVE'));
    await open();
    await submit('Current1!', 'Newpass1!', 'Newpass1!');
    await waitFor(() => expect(useSessionStore.getState().status).toBe('anonymous'));
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(SESSION_ENDED.ACCOUNT_NOT_ACTIVE);
  });

  it('다른 계정으로 로그인하면 로그아웃하고 로그인 화면으로 간다', async () => {
    server.use(restOk('/seller/logout', null, 204));
    const router = open();
    await router;
    await fireEvent.press(screen.getByRole('button', { name: '다른 계정으로 로그인' }));
    await waitFor(() => expect(router.getPathname()).toBe('/login'));
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
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
    expect(toast.error).toHaveBeenCalledWith('세션이 만료되었습니다. 다시 로그인해 주세요.');
  });

  it('토큰 만료 401은 refresh로 받은 새 토큰으로 재시도해 성공한다', async () => {
    const auths: (string | null)[] = [];
    server.use(
      restOk('/seller/refresh', {
        accessToken: 'at2',
        tokenType: 'Bearer',
        expiresInSeconds: 900,
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
