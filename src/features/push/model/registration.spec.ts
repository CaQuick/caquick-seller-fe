import * as Notifications from 'expo-notifications';
import { graphql, http, HttpResponse } from 'msw';
import { Platform } from 'react-native';
import { toast } from 'sonner-native';

import { logout, onBeforeLogout, useSessionStore } from '@/features/auth';
import { AUTH_URL } from '@/shared/config/env';
import { mockSecureStore } from '@/test/mocks';
import { server } from '@/test/msw/server';

import { PUSH_COPY } from './copy';
import {
  ANDROID_CHANNEL_ID,
  ensurePushToken,
  hasPushToken,
  releasePushToken,
} from './registration';

const mockEas: { projectId?: string } = {};
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      // expo-router가 import 시점(mockEas 초기화 전)에도 읽는다
      const projectId = (mockEas as typeof mockEas | undefined)?.projectId;
      return { extra: projectId ? { eas: { projectId } } : {} };
    },
    easConfig: null,
  },
}));
jest.mock('sonner-native', () => ({ toast: jest.fn() }));

const permission = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain, status: granted ? 'granted' : 'denied' }) as never;

const calls: { op: string; input: unknown }[] = [];
function handlers() {
  server.use(
    graphql.mutation('SellerPushRegisterToken', ({ variables }) => {
      calls.push({ op: 'register', input: variables.input });
      return HttpResponse.json({ data: { sellerRegisterPushToken: true } });
    }),
    graphql.mutation('SellerPushUnregisterToken', ({ variables }) => {
      calls.push({ op: 'unregister', input: variables.input });
      return HttpResponse.json({ data: { sellerUnregisterPushToken: true } });
    }),
  );
}

describe('푸시 토큰 등록', () => {
  beforeEach(() => {
    mockEas.projectId = 'proj-1';
    calls.length = 0;
    handlers();
    jest.clearAllMocks();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(true));
  });
  afterEach(async () => {
    await releasePushToken();
  });

  it('권한이 있으면 Expo 토큰을 받아 플랫폼과 함께 등록한다', async () => {
    await expect(ensurePushToken({ prompt: false })).resolves.toBe('ExponentPushToken[test]');
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-1' });
    expect(calls).toEqual([
      { op: 'register', input: { token: 'ExponentPushToken[test]', platform: 'IOS' } },
    ]);
    expect(hasPushToken()).toBe(true);
    // iOS는 채널이 없다
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('겹친 호출은 한 번만 등록하고, 다음 시작 때는 같은 토큰을 다시 보낸다', async () => {
    await Promise.all([ensurePushToken({ prompt: false }), ensurePushToken({ prompt: false })]);
    expect(calls).toHaveLength(1);
    await ensurePushToken({ prompt: false });
    expect(calls.map((c) => c.input)).toEqual([
      { token: 'ExponentPushToken[test]', platform: 'IOS' },
      { token: 'ExponentPushToken[test]', platform: 'IOS' },
    ]);
  });

  it('Android는 BE와 같은 id로 채널을 먼저 만든다', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await ensurePushToken({ prompt: false });
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      ANDROID_CHANNEL_ID,
      expect.objectContaining({ importance: Notifications.AndroidImportance.HIGH }),
    );
    expect(ANDROID_CHANNEL_ID).toBe('default');
    expect(calls[0]?.input).toEqual({ token: 'ExponentPushToken[test]', platform: 'ANDROID' });
  });

  it('EAS projectId가 없으면 토큰을 받지 않고 로그만 남긴다', async () => {
    delete mockEas.projectId;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(ensurePushToken({ prompt: false })).resolves.toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('projectId'));
    warn.mockRestore();
  });

  it('앱 시작(prompt 없음)에는 권한을 묻지 않고 건너뛴다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(false));
    await expect(ensurePushToken({ prompt: false })).resolves.toBeNull();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('로그인 직후 권한을 묻고, 거부하면 설정에서 켜는 방법을 안내한다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(false));
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(permission(false, false));
    await expect(ensurePushToken({ prompt: true })).resolves.toBeNull();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(PUSH_COPY.denied);
    expect(calls).toEqual([]);
  });

  it('로그인 직후 권한을 허용하면 바로 등록한다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(false));
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(permission(true));
    await ensurePushToken({ prompt: true });
    expect(toast).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it('OS가 더 묻지 못하게 막았으면 팝업을 띄우지 않는다', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(false, false));
    await ensurePushToken({ prompt: true });
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('푸시 토큰 해제', () => {
  beforeEach(() => {
    mockEas.projectId = 'proj-1';
    calls.length = 0;
    handlers();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(true));
  });

  it('등록한 토큰을 해제하고 잊는다', async () => {
    await ensurePushToken({ prompt: false });
    await releasePushToken();
    expect(calls.map((c) => c.op)).toEqual(['register', 'unregister']);
    expect(calls[1]?.input).toEqual({ token: 'ExponentPushToken[test]' });
    expect(hasPushToken()).toBe(false);
    await releasePushToken();
    expect(calls).toHaveLength(2);
  });

  it('진행 중인 등록이 끝나길 기다렸다가 해제한다', async () => {
    const pending = ensurePushToken({ prompt: false });
    await releasePushToken();
    await pending;
    expect(calls.map((c) => c.op)).toEqual(['register', 'unregister']);
  });

  it('등록한 적이 없으면 아무것도 보내지 않는다', async () => {
    await releasePushToken();
    expect(calls).toEqual([]);
  });
});

describe('로그아웃', () => {
  let release: () => void;
  beforeEach(() => {
    mockEas.projectId = 'proj-1';
    calls.length = 0;
    handlers();
    server.use(
      http.post(`${AUTH_URL}/seller/logout`, () => {
        calls.push({ op: 'logout', input: null });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permission(true));
    useSessionStore.setState({
      status: 'authenticated',
      accessToken: 'at',
      mustChangePassword: false,
    });
    mockSecureStore.set('caquick.refreshToken', 'rt');
    release = onBeforeLogout(releasePushToken);
  });
  afterEach(() => release());

  it('푸시 토큰을 해제한 뒤 서버 세션을 끝낸다', async () => {
    await ensurePushToken({ prompt: false });
    await logout();
    expect(calls.map((c) => c.op)).toEqual(['register', 'unregister', 'logout']);
    expect(useSessionStore.getState().status).toBe('anonymous');
  });

  it('토큰 해제가 실패해도 로그아웃은 끝까지 간다', async () => {
    await ensurePushToken({ prompt: false });
    server.use(graphql.mutation('SellerPushUnregisterToken', () => HttpResponse.error()));
    await logout();
    expect(calls.map((c) => c.op)).toEqual(['register', 'logout']);
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(mockSecureStore.has('caquick.refreshToken')).toBe(false);
  });
});
