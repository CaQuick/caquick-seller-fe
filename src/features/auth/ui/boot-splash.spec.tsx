import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SplashScreen } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { HttpResponse, http } from 'msw';

import { resetSessionHooks } from '@/shared/api';
import { AUTH_URL } from '@/shared/config/env';
import { mockSecureStore } from '@/test/mocks';
import { gqlOk, restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { authKeys } from '../api/queryKeys';
import { AUTH_COPY } from '../model/messages';
import { useSessionStore } from '../model/session-store';
import { BootSplash } from './boot-splash';

jest.mock('expo-router', () => ({
  ...jest.requireActual<object>('expo-router'),
  SplashScreen: { hideAsync: jest.fn(() => Promise.resolve()) },
}));

const me = {
  accountId: '7',
  username: 'hazecake',
  displayName: '김하제',
  storeId: '3',
  mustChangePassword: false,
  accountStatus: 'ACTIVE',
};
const session = {
  accessToken: 'at',
  tokenType: 'Bearer',
  expiresInSeconds: 900,
  accountStatus: 'ACTIVE',
  mustChangePassword: false,
  refreshToken: 'rt2',
  refreshExpiresAt: '2026-11-05T00:00:00.000Z',
};
const splash = () => screen.queryByLabelText('케이퀵 판매자 시작 중');

function open(queryClient: QueryClient = createTestQueryClient()) {
  return renderWithProviders(<BootSplash />, { queryClient });
}

describe('BootSplash', () => {
  beforeEach(() =>
    useSessionStore.setState({
      status: 'unknown',
      accessToken: null,
      expiresAt: null,
      mustChangePassword: false,
    }),
  );
  afterEach(() => resetSessionHooks());

  it('네이티브 스플래시를 내리고, 저장된 세션이 없으면 걷힌다', async () => {
    await open();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    await waitFor(() => expect(splash()).toBeNull());
    expect(useSessionStore.getState().status).toBe('anonymous');
  });

  it('세션을 복원하고 내 계정을 캐시에 채운 뒤 걷힌다', async () => {
    mockSecureStore.set('caquick.refreshToken', 'rt');
    server.use(restOk('/seller/refresh', session), gqlOk('SellerAuthMe', { sellerMe: me }));
    // 테스트 기본(gcTime 0)은 관찰자 없는 캐시를 바로 버린다. Infinity는 GC 타이머도 두지 않는다
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    await open(queryClient);
    await waitFor(() => expect(splash()).toBeNull());
    expect(queryClient.getQueryData(authKeys.me())).toEqual(me);
  });

  it('네트워크 장애면 토큰을 남기고 다시 시도를 띄운다', async () => {
    mockSecureStore.set('caquick.refreshToken', 'rt');
    server.use(http.post(`${AUTH_URL}/seller/refresh`, () => HttpResponse.error()));
    await open();
    expect(await screen.findByText(AUTH_COPY.offline)).toBeTruthy();
    expect(mockSecureStore.get('caquick.refreshToken')).toBe('rt');

    server.use(restOk('/seller/refresh', session), gqlOk('SellerAuthMe', { sellerMe: me }));
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(splash()).toBeNull());
    expect(useSessionStore.getState().status).toBe('authenticated');
  });

  describe('로딩 점', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('1초 안에는 보이지 않고 그 뒤에 나타난다', async () => {
      // 부팅이 끝나지 않게 저장소 읽기를 붙잡아 둔다
      jest.mocked(SecureStore.getItemAsync).mockReturnValueOnce(new Promise(() => undefined));
      await open();
      await act(() => jest.advanceTimersByTime(999));
      expect(screen.queryByTestId('boot-dots')).toBeNull();
      await act(() => jest.advanceTimersByTime(1));
      expect(screen.getByTestId('boot-dots')).toBeTruthy();
      expect(splash()).toBeTruthy();
    });
  });
});
