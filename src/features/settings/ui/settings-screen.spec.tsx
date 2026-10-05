import * as Notifications from 'expo-notifications';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as Updates from 'expo-updates';
import { Linking } from 'react-native';
import { toast } from 'sonner-native';

import { useSessionStore } from '@/features/auth';
import { mockSecureStore } from '@/test/mocks';
import { gqlOk, restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { SETTINGS_COPY } from '../model/copy';
import { SettingsScreen } from './settings-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));
jest.mock('expo-constants', () => {
  const actual = jest.requireActual<{ default: object }>('expo-constants').default;
  return {
    __esModule: true,
    default: {
      ...actual,
      expoConfig: { version: '1.0.0' },
      platform: { ios: { buildNumber: '12' } },
    },
  };
});
jest.mock('sonner-native', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));

const me = (displayName: string | null) =>
  gqlOk('SellerAuthMe', {
    sellerMe: {
      accountId: '7',
      username: 'hazecake',
      displayName,
      storeId: '3',
      mustChangePassword: false,
      accountStatus: 'ACTIVE',
    },
  });
const store = gqlOk('SellerSettingsStore', {
  sellerMyStore: { id: '3', storeName: '해즈 케이크' },
});

function open() {
  return renderRouter(
    { 'settings/index': SettingsScreen, 'settings/change-password': () => null },
    { initialUrl: '/settings', wrapper: Providers },
  );
}

const updates = (patch: Partial<ReturnType<typeof Updates.useUpdates>> = {}) =>
  jest.mocked(Updates.useUpdates).mockReturnValue({
    isUpdateAvailable: false,
    isUpdatePending: false,
    isChecking: false,
    isDownloading: false,
    ...patch,
  } as ReturnType<typeof Updates.useUpdates>);

const g = globalThis as unknown as { __DEV__: boolean };

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({
      status: 'authenticated',
      accessToken: 'at',
      mustChangePassword: false,
    });
    mockSecureStore.set('caquick.refreshToken', 'rt');
    server.use(me('김하제'), store);
    updates();
  });

  it('계정 정보와 앱 버전을 보여 준다', async () => {
    await open();
    expect(await screen.findByText('김하제')).toBeTruthy();
    expect(screen.getByText('hazecake')).toBeTruthy();
    expect(await screen.findByText('해즈 케이크')).toBeTruthy();
    expect(screen.getByText('1.0.0 (빌드 12)')).toBeTruthy();
  });

  it('표시 이름이 없으면 아이디를 쓴다', async () => {
    server.use(me(null));
    await open();
    await waitFor(() => expect(screen.getAllByText('hazecake')).toHaveLength(2));
  });

  it('비밀번호 변경 화면으로 이동한다', async () => {
    const router = open();
    await router;
    await fireEvent.press(screen.getByRole('button', { name: '비밀번호 변경' }));
    await waitFor(() => expect(router.getPathname()).toBe('/settings/change-password'));
  });

  it('알림을 허용했으면 허용으로 표시한다', async () => {
    await open();
    expect(await screen.findByRole('button', { name: '알림 권한, 허용' })).toBeTruthy();
    expect(screen.queryByText('설정 열기')).toBeNull();
  });

  it('알림을 거부했으면 거부와 설정 열기를 보여 주고 시스템 설정으로 보낸다', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValueOnce({ granted: false, status: 'denied' } as never);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await open();
    const row = await screen.findByRole('button', { name: '알림 권한, 거부, 설정 열기' });
    expect(screen.getByText('거부')).toBeTruthy();
    await fireEvent.press(row);
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('로그아웃을 확인하면 서버 세션을 끝내고 로컬 세션을 비운다', async () => {
    server.use(restOk('/seller/logout', null, 204));
    await open();
    // 시트 mock은 내용을 늘 그린다 — 앞이 화면 버튼, 뒤가 시트의 확정 버튼
    const [open_, confirm] = screen.getAllByRole('button', { name: '로그아웃' });
    await fireEvent.press(open_!);
    expect(screen.getByText(SETTINGS_COPY.logoutTitle)).toBeTruthy();
    expect(useSessionStore.getState().status).toBe('authenticated');
    await fireEvent.press(confirm!);
    await waitFor(() => expect(useSessionStore.getState().status).toBe('anonymous'));
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
  });

  describe('업데이트 확인', () => {
    const dev = g.__DEV__;
    beforeEach(() => {
      g.__DEV__ = false;
      jest.replaceProperty(Updates, 'isEnabled', true);
    });
    afterEach(() => {
      g.__DEV__ = dev;
    });

    const row = (description: string) =>
      screen.findByRole('button', { name: `업데이트 확인, ${description}` });

    it('dev 빌드에서는 비활성으로 표시하고 누를 수 없다', async () => {
      g.__DEV__ = true;
      await open();
      expect(await screen.findByText(SETTINGS_COPY.updateDisabled)).toBeTruthy();
      expect(screen.queryByRole('button', { name: /업데이트 확인/ })).toBeNull();
    });

    it('새 버전이 없으면 최신 토스트를 띄운다', async () => {
      await open();
      await fireEvent.press(await row(SETTINGS_COPY.updateNever));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith(SETTINGS_COPY.upToDate));
      expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
    });

    it('새 버전이 있으면 받아 두고 재시작을 안내한다', async () => {
      jest
        .mocked(Updates.checkForUpdateAsync)
        .mockResolvedValueOnce({ isAvailable: true } as never);
      await open();
      await fireEvent.press(await row(SETTINGS_COPY.updateNever));
      await waitFor(() => expect(toast).toHaveBeenCalledWith(SETTINGS_COPY.downloaded));
      expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
      expect(Updates.reloadAsync).not.toHaveBeenCalled();
    });

    it('받아 둔 새 버전은 눌러서 다시 시작한다', async () => {
      updates({ isUpdateAvailable: true, isUpdatePending: true });
      await open();
      await fireEvent.press(await row(SETTINGS_COPY.updatePending));
      await waitFor(() => expect(Updates.reloadAsync).toHaveBeenCalledTimes(1));
      expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    });

    it('있다고 알려진 새 버전은 확인 없이 받는다', async () => {
      updates({ isUpdateAvailable: true });
      await open();
      await fireEvent.press(await row(SETTINGS_COPY.updateAvailable));
      await waitFor(() => expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1));
      expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    });

    it('진행 중이면 누를 수 없다', async () => {
      updates({ isChecking: true });
      await open();
      expect(await screen.findByText(SETTINGS_COPY.updateChecking)).toBeTruthy();
      expect(screen.queryByRole('button', { name: /업데이트 확인/ })).toBeNull();
    });

    it('확인에 실패하면 오류 토스트를 띄운다', async () => {
      jest.mocked(Updates.checkForUpdateAsync).mockRejectedValueOnce(new Error('offline'));
      await open();
      await fireEvent.press(await row(SETTINGS_COPY.updateNever));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(SETTINGS_COPY.updateFailed));
    });
  });
});
