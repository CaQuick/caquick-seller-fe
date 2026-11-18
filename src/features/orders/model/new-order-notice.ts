import { router } from 'expo-router';

import { showToast } from '@/shared/ui';

/** 주문 알림 종류(BE 푸시 data.kind와 같은 값) */
export type OrderNoticeKind = 'ORDER_SUBMITTED' | 'ORDER_CANCELED' | 'ORDER_CONFIRM_REMINDER';

const RECENT = 50;
const notified = new Set<string>();

/**
 * 주문 인앱 토스트(누르면 주문 상세). 새 주문은 주문 구독과 포그라운드 푸시가 함께 알리므로
 * 최근 `${kind}:${orderId}`를 기억해 먼저 온 쪽만 띄운다. 같은 주문의 다른 알림(취소 등)은 막지 않는다. 띄웠으면 true
 */
export function notifyOrder(kind: OrderNoticeKind, orderId: string, message: string): boolean {
  const key = `${kind}:${orderId}`;
  if (notified.has(key)) return false;
  notified.add(key);
  if (notified.size > RECENT) notified.delete(notified.values().next().value!);
  showToast.info(message, () => router.push({ pathname: '/orders/[id]', params: { id: orderId } }));
  return true;
}

export const notifyNewOrder = (orderId: string, summary: string) =>
  notifyOrder('ORDER_SUBMITTED', orderId, summary ? `새 주문: ${summary}` : '새 주문');
