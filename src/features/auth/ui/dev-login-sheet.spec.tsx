import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { HttpResponse, http } from 'msw';

import { resetSessionHooks } from '@/shared/api';
import { AUTH_URL } from '@/shared/config/env';
import { mockSecureStore } from '@/test/mocks';
import { restError, restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { DEV_LOGIN_COPY, SECRET_TAP_GAP_MS } from '../model/dev-login';
import { installSessionHooks } from '../model/session';
import { useSessionStore } from '../model/session-store';
import { LoginScreen } from './login-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));

const g = globalThis as unknown as { __DEV__: boolean };
const token = { accessToken: 'dev-at', tokenType: 'Bearer', expiresInSeconds: 900 };

function open() {
  return renderRouter({ login: LoginScreen, index: () => null }, { initialUrl: '/login' });
}

const logo = () => screen.getByRole('button', { name: '케이퀵 로고' });

async function tapLogo(times: number) {
  for (let i = 0; i < times; i += 1) await fireEvent.press(logo());
}

async function openSheet() {
  await tapLogo(5);
  expect(await screen.findByText(DEV_LOGIN_COPY.title)).toBeTruthy();
}

async function submit(accountId: string) {
  await fireEvent.changeText(screen.getByLabelText(DEV_LOGIN_COPY.label), accountId);
  await fireEvent.press(screen.getByRole('button', { name: DEV_LOGIN_COPY.submit }));
}

describe('개발용 로그인', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'anonymous', accessToken: null, mustChangePassword: false });
    installSessionHooks();
  });
  afterEach(() => resetSessionHooks());

  it('로고를 네 번 눌러서는 열리지 않고 다섯 번째에 시트가 열린다', async () => {
    await open();
    await tapLogo(4);
    expect(screen.queryByText(DEV_LOGIN_COPY.title)).toBeNull();
    await tapLogo(1);
    expect(await screen.findByText(DEV_LOGIN_COPY.title)).toBeTruthy();
    expect(screen.getByLabelText(DEV_LOGIN_COPY.label)).toHaveProp('keyboardType', 'number-pad');
  });

  it('반증: 탭 사이가 벌어지면 다섯 번을 눌러도 열리지 않는다', async () => {
    await open();
    // renderRouter가 가짜 타이머를 켜서 Date.now도 그 시계를 따른다
    for (let i = 0; i < 5; i += 1) {
      await fireEvent.press(logo());
      jest.advanceTimersByTime(SECRET_TAP_GAP_MS + 1);
    }
    expect(screen.queryByText(DEV_LOGIN_COPY.title)).toBeNull();
  });

  it('숫자가 아니면 서버를 부르지 않고 오류를 보여 준다', async () => {
    let called = 0;
    server.use(
      http.post(`${AUTH_URL}/dev/issue-token`, () => {
        called += 1;
        return HttpResponse.json(token);
      }),
    );
    await open();
    await openSheet();
    await submit('12a');
    expect(await screen.findByText('계정 ID는 숫자로 입력해 주세요')).toBeTruthy();
    expect(called).toBe(0);

    await fireEvent.changeText(screen.getByLabelText(DEV_LOGIN_COPY.label), '12');
    expect(screen.queryByText('계정 ID는 숫자로 입력해 주세요')).toBeNull();
  });

  it('토큰을 받으면 refresh 토큰 없이 세션을 열고 홈으로 간다', async () => {
    server.use(restOk('/dev/issue-token', token));
    const router = open();
    await router;
    await openSheet();
    await submit('12');
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'dev-at',
      mustChangePassword: false,
    });
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
  });

  it('운영 서버가 DEV_ONLY_ENDPOINT를 돌려주면 그 안내를 보여 주고 세션은 그대로다', async () => {
    server.use(
      restError(
        '/dev/issue-token',
        403,
        '개발 환경에서만 사용할 수 있는 엔드포인트입니다.',
        'DEV_ONLY_ENDPOINT',
      ),
    );
    const router = open();
    await router;
    await openSheet();
    await submit('12');
    expect(await screen.findByText(DEV_LOGIN_COPY.devOnly)).toBeTruthy();
    expect(screen.getByRole('button', { name: DEV_LOGIN_COPY.submit })).toBeEnabled();
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(router.getPathname()).toBe('/login');
  });

  it('키보드 완료로도 보내고, 없는 계정이면 서버 문구를 그대로 보여 준다', async () => {
    server.use(restError('/dev/issue-token', 404, '계정을 찾을 수 없습니다.', 'ACCOUNT_NOT_FOUND'));
    await open();
    await openSheet();
    const input = screen.getByLabelText(DEV_LOGIN_COPY.label);
    await fireEvent.changeText(input, '999');
    await fireEvent(input, 'submitEditing');
    expect(await screen.findByText('계정을 찾을 수 없습니다.')).toBeTruthy();
  });

  it('반증: __DEV__가 false면 로고가 버튼이 아니라 진입할 수 없다', async () => {
    const dev = g.__DEV__;
    g.__DEV__ = false;
    try {
      await open();
      expect(screen.getByLabelText('케이퀵')).toBeTruthy();
      expect(screen.queryByRole('button', { name: '케이퀵 로고' })).toBeNull();
      await fireEvent.press(screen.getByLabelText('케이퀵'));
      expect(screen.queryByText(DEV_LOGIN_COPY.title)).toBeNull();
    } finally {
      g.__DEV__ = dev;
    }
  });
});
