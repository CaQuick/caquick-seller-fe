import { type QueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { type Href, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { onBeforeLogout, useSessionStore } from '@/features/auth';
import { notifyNewOrder } from '@/features/orders';
import { showToast } from '@/shared/ui';

import { PUSH_COPY } from './copy';
import { ensurePushToken, hasPushToken, releasePushToken } from './registration';
import { hrefFor, parsePushData, shouldToastMessage, staleKeysFor } from './routing';

type Session = ReturnType<typeof useSessionStore.getState>;
const isReady = (s: Session) => s.status === 'authenticated' && !s.mustChangePassword;

const sync = (prompt: boolean) =>
  void ensurePushToken({ prompt }).catch((e: unknown) => {
    console.warn('[push] 토큰 등록 실패 — 다음 시작 때 다시 시도합니다', e);
  });

/**
 * 루트에서 한 번: 토큰 등록·해제, 포그라운드 수신(시스템 배너 대신 인앱 토스트 + 캐시 무효화),
 * 알림 탭 딥링크(콜드 스타트 포함). 세션이 없을 때 누른 알림은 로그인 뒤에 연다
 */
export function usePushNotifications(queryClient: QueryClient) {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  const ready = useSessionStore(isReady);
  const pending = useRef<Href | null>(null);
  const handled = useRef<string | null>(null);

  const open = useCallback((response: Notifications.NotificationResponse) => {
    const { identifier, content } = response.notification.request;
    // 콜드 스타트 응답은 리스너와 getLastNotificationResponse 양쪽으로 올 수 있다
    if (handled.current === identifier) return;
    handled.current = identifier;
    Notifications.clearLastNotificationResponse();
    const target = parsePushData(content.data);
    if (!target) return;
    if (isReady(useSessionStore.getState())) router.push(hrefFor(target));
    else pending.current = hrefFor(target);
  }, []);

  useEffect(() => {
    if (isReady(useSessionStore.getState())) sync(false);
    const unsubscribe = useSessionStore.subscribe((s, prev) => {
      // 로그인 직후에만 권한을 묻는다(세션 복원은 anonymous를 거치지 않는다)
      if (isReady(s) && !isReady(prev)) sync(prev.status === 'anonymous');
    });
    // 설정에서 권한을 켜고 돌아온 경우
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isReady(useSessionStore.getState()) && !hasPushToken()) sync(false);
    });
    const release = onBeforeLogout(releasePushToken);
    return () => {
      unsubscribe();
      appState.remove();
      release();
    };
  }, []);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: () =>
        Promise.resolve({
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
    });
    const received = Notifications.addNotificationReceivedListener(({ request }) => {
      const target = parsePushData(request.content.data);
      if (!target) return;
      for (const queryKey of staleKeysFor(target)) void queryClient.invalidateQueries({ queryKey });
      const { title, body } = request.content;
      // 새 주문은 구독이 먼저 알렸으면 건너뛴다(구독이 끊겼을 때 푸시가 대신 알림)
      if (target.kind === 'ORDER_SUBMITTED') notifyNewOrder(target.orderId, body ?? '');
      else if (shouldToastMessage(target.conversationId, pathRef.current))
        showToast.info(PUSH_COPY.foreground(title ?? '', body ?? ''));
    });
    const response = Notifications.addNotificationResponseReceivedListener((r) => open(r));
    return () => {
      received.remove();
      response.remove();
    };
  }, [queryClient, open]);

  useEffect(() => {
    if (!ready) return;
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last);
    const href = pending.current;
    pending.current = null;
    if (href) router.push(href);
  }, [ready, open]);
}
