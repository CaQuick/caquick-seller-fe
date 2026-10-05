import * as Notifications from 'expo-notifications';
import { router, Slot } from 'expo-router';
import { act, renderRouter, waitFor } from 'expo-router/testing-library';
import { AppState } from 'react-native';
import { toast } from 'sonner-native';

import { useSessionStore } from '@/features/auth';
import { createTestQueryClient } from '@/test/render';

import { ensurePushToken, hasPushToken } from './registration';
import { usePushNotifications } from './use-push-notifications';

jest.mock('./registration', () => ({
  ensurePushToken: jest.fn(() => Promise.resolve('ExponentPushToken[test]')),
  hasPushToken: jest.fn(() => true),
  releasePushToken: jest.fn(() => Promise.resolve()),
}));
jest.mock('sonner-native', () => ({ toast: Object.assign(jest.fn(), { dismiss: jest.fn() }) }));

const queryClient = createTestQueryClient();
function Layout() {
  usePushNotifications(queryClient);
  return <Slot />;
}
const blank = () => null;
const routes = {
  _layout: Layout,
  index: blank,
  chats: blank,
  'chats/[conversationId]': blank,
  'orders/[id]': blank,
};
const open = (initialUrl = '/') => renderRouter(routes, { initialUrl });

const notification = (
  data: Record<string, string>,
  id = 'n1',
  title = '새 문의',
  body = '안녕하세요',
) =>
  ({
    date: 0,
    request: { identifier: id, content: { title, body, data }, trigger: null },
  }) as unknown as Notifications.Notification;
const response = (data: Record<string, string>, id = 'n1') =>
  ({
    notification: notification(data, id),
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
  }) as unknown as Notifications.NotificationResponse;

const received = (n: Notifications.Notification) =>
  act(() =>
    Promise.resolve(
      jest.mocked(Notifications.addNotificationReceivedListener).mock.calls.at(-1)![0](n),
    ),
  );
const tapped = (r: Notifications.NotificationResponse) =>
  act(() =>
    Promise.resolve(
      jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls.at(-1)![0](r),
    ),
  );
const signIn = (s: Partial<ReturnType<typeof useSessionStore.getState>>) =>
  act(() => Promise.resolve(useSessionStore.setState(s)));

const signedIn = { status: 'authenticated' as const, accessToken: 'at', mustChangePassword: false };
const MESSAGE = { kind: 'BUYER_MESSAGE', conversationId: 'c9' };
const ORDER = { kind: 'ORDER_SUBMITTED', orderId: '5' };

describe('usePushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasPushToken).mockReturnValue(true);
    useSessionStore.setState(signedIn);
  });

  it('포그라운드 알림은 시스템 배너를 띄우지 않는다', async () => {
    await open();
    const { handleNotification } = jest
      .mocked(Notifications.setNotificationHandler)
      .mock.calls.at(-1)![0]!;
    await expect(handleNotification(notification(MESSAGE))).resolves.toEqual({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
  });

  it('새 문의는 인앱 토스트로 알리고 대화 캐시를 무효화한다', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await open('/orders/3');
    await received(notification(MESSAGE));
    expect(toast).toHaveBeenCalledWith('새 문의 · 안녕하세요');
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([
      ['chats', 'conversations'],
      ['chats', 'messages', 'c9'],
      ['home'],
    ]);
  });

  it.each(['/chats', '/chats/c9'])('%s에 있으면 문의 토스트를 띄우지 않는다', async (url) => {
    await open(url);
    await received(notification(MESSAGE));
    expect(toast).not.toHaveBeenCalled();
  });

  it('새 주문은 토스트 없이 주문·홈 캐시만 무효화한다(주문 구독이 알린다)', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await open();
    await received(notification(ORDER, 'n2', '새 주문', '딸기 타르트 1개'));
    expect(toast).not.toHaveBeenCalled();
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([['orders', 'list'], ['home']]);
  });

  it('모르는 알림은 무시한다', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await open();
    await received(notification({ kind: 'REVIEW' }));
    expect(invalidate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it.each([
    [ORDER, '/orders/5'],
    [MESSAGE, '/chats/c9'],
  ])('알림을 누르면 data.kind로 화면을 연다 %j', async (data, path) => {
    const r = open();
    await r;
    await tapped(response(data));
    await waitFor(() => expect(r.getPathname()).toBe(path));
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
  });

  it('콜드 스타트: 세션이 복원된 뒤 마지막 알림을 한 번만 연다', async () => {
    useSessionStore.setState({ status: 'unknown', accessToken: null });
    jest
      .mocked(Notifications.getLastNotificationResponse)
      .mockReturnValue(response(MESSAGE, 'cold'));
    const push = jest.spyOn(router, 'push');
    const r = open();
    await r;
    expect(push).not.toHaveBeenCalled();
    await signIn(signedIn);
    await waitFor(() => expect(r.getPathname()).toBe('/chats/c9'));
    // 같은 응답이 리스너로도 오면 다시 열지 않는다
    await tapped(response(MESSAGE, 'cold'));
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('로그아웃 상태에서 누른 알림은 로그인 뒤에 연다', async () => {
    useSessionStore.setState({ status: 'anonymous', accessToken: null });
    const r = open();
    await r;
    await tapped(response(ORDER, 'n3'));
    expect(r.getPathname()).toBe('/');
    await signIn(signedIn);
    await waitFor(() => expect(r.getPathname()).toBe('/orders/5'));
  });

  it('세션 복원은 권한을 묻지 않고, 로그인 직후에만 묻는다', async () => {
    useSessionStore.setState({ status: 'unknown', accessToken: null });
    await open();
    expect(ensurePushToken).not.toHaveBeenCalled();
    await signIn(signedIn);
    expect(ensurePushToken).toHaveBeenLastCalledWith({ prompt: false });

    await signIn({ status: 'anonymous', accessToken: null });
    await signIn(signedIn);
    expect(ensurePushToken).toHaveBeenLastCalledWith({ prompt: true });
    expect(ensurePushToken).toHaveBeenCalledTimes(2);
  });

  it('비밀번호 변경이 강제된 세션은 등록하지 않는다', async () => {
    useSessionStore.setState({ status: 'anonymous', accessToken: null });
    await open();
    await signIn({ ...signedIn, mustChangePassword: true });
    expect(ensurePushToken).not.toHaveBeenCalled();
  });

  it('토큰이 없으면 포그라운드 복귀 때 다시 등록한다(설정에서 권한을 켠 경우)', async () => {
    await open();
    expect(ensurePushToken).toHaveBeenCalledTimes(1);
    const listeners = jest
      .mocked(AppState.addEventListener)
      .mock.calls.filter(([type]) => type === 'change')
      .map(([, fn]) => fn as (s: string) => void);
    await act(() => Promise.resolve(listeners.forEach((fn) => fn('active'))));
    expect(ensurePushToken).toHaveBeenCalledTimes(1);
    jest.mocked(hasPushToken).mockReturnValue(false);
    await act(() => Promise.resolve(listeners.forEach((fn) => fn('active'))));
    expect(ensurePushToken).toHaveBeenCalledTimes(2);
  });

  it('등록 실패는 경고만 남긴다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(ensurePushToken).mockRejectedValueOnce(new Error('offline'));
    await open();
    await act(() => Promise.resolve());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('토큰 등록 실패'), expect.any(Error));
    warn.mockRestore();
  });
});
