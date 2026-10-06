import { router } from 'expo-router';

import { showToast } from '@/shared/ui';

const RECENT = 50;
const notified = new Set<string>();

/**
 * 새 주문 인앱 토스트(누르면 주문 상세). 주문 구독과 포그라운드 푸시가 같은 주문을 알리므로
 * 최근 orderId를 기억해 먼저 온 쪽만 띄운다. 띄웠으면 true
 */
export function notifyNewOrder(orderId: string, summary: string): boolean {
  if (notified.has(orderId)) return false;
  notified.add(orderId);
  if (notified.size > RECENT) notified.delete(notified.values().next().value!);
  showToast.info(summary ? `새 주문: ${summary}` : '새 주문', () =>
    router.push({ pathname: '/orders/[id]', params: { id: orderId } }),
  );
  return true;
}
