import { router } from 'expo-router';

import { formatPickupKst, formatTimeKst } from '@/shared/lib/kst';
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

/** BE 미리 알림과 같은 2시간: 마감까지 이보다 덜 남고 접수되면 미리 알림이 없으니 새 주문 알림에 마감을 싣는다 */
const CONFIRM_REMINDER_LEAD_MS = 2 * 60 * 60 * 1000;

/** 구독 이벤트로 띄우는 새 주문 요약. BE 새 주문 푸시와 같은 규칙(마감 − 2시간 ≤ 접수)으로 확정 마감 시각을 붙인다 */
export function newOrderSummary(u: {
  productName: string;
  pickupAt: string;
  confirmDeadlineAt?: string | null;
  updatedAt: string;
}): string {
  const base = `${u.productName} · 픽업 ${formatPickupKst(u.pickupAt)}`;
  if (!u.confirmDeadlineAt) return base;
  const tight =
    Date.parse(u.confirmDeadlineAt) - CONFIRM_REMINDER_LEAD_MS <= Date.parse(u.updatedAt);
  return tight ? `${base} · ${formatTimeKst(u.confirmDeadlineAt)}까지 확정` : base;
}
