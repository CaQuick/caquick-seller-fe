import {
  type OrderActorType,
  type OrderStatusType,
  type PaymentMethodType,
  type RefundStatusType,
  type SellerOrderDetailQuery,
} from '@/graphql/generated/graphql';
import { enumView } from '@/shared/lib/enum-view';
import { formatKrw, formatNumber } from '@/shared/lib/format';

import { formatDateTime } from './format';

type OrderDetail = SellerOrderDetailQuery['sellerOrder'];

export interface PaymentRow {
  label: string;
  value: string;
  /** 값 아래 작은 안내 */
  hint?: string;
}

export const paymentMethodLabel = enumView(
  { BANK_TRANSFER: '계좌이체', TOSS: '토스' } satisfies Record<PaymentMethodType, string>,
  '기타',
);

export const refundStatusLabel = enumView(
  {
    AWAITING_ACCOUNT: '구매자 계좌 입력 대기',
    AWAITING_TRANSFER: '케이퀵 송금 대기',
    COMPLETED: '환불 완료',
  } satisfies Record<RefundStatusType, string>,
  '확인 필요',
);

export const cancelActorLabel = enumView(
  {
    BUYER: '구매자',
    SELLER: '매장',
    ADMIN: '케이퀵',
    SYSTEM: '자동 취소',
  } satisfies Record<OrderActorType, string>,
  '기타',
);

/** bp → '5.5%' */
export const formatCommissionRate = (bps: number) => `${formatNumber(bps / 100)}%`;

/** 정산이 아직 확정되지 않는 진행 상태(확정되면 실제 지급액이 온다) */
const UNSETTLED: readonly OrderStatusType[] = ['SUBMITTED', 'CONFIRMED', 'MADE'];

/** 결제 카드 아래 결제 수단·접수 일시·수수료율·정산 예정 금액. 결제 도입 전 주문은 없는 값을 뺀다 */
export function settlementRows(order: OrderDetail): PaymentRow[] {
  const rows: PaymentRow[] = [];
  if (order.paymentMethod)
    rows.push({ label: '결제 수단', value: paymentMethodLabel(order.paymentMethod) });
  if (order.submittedAt)
    rows.push({ label: '접수 일시', value: formatDateTime(order.submittedAt) });
  rows.push({ label: '수수료율', value: formatCommissionRate(order.commissionRateBps) });
  if (order.expectedPayoutAmount !== null) {
    const pending = order.settlementBaseAmount === null && UNSETTLED.includes(order.status);
    rows.push({
      label: '정산 예정 금액',
      value: formatKrw(order.expectedPayoutAmount),
      ...(pending ? { hint: '픽업 완료 시 확정' } : {}),
    });
  }
  return rows;
}

/** 취소 주문의 주체·사유·환불. 환불이 없으면 상태 줄을 뺀다 */
export function cancellationRows(order: OrderDetail): PaymentRow[] {
  const c = order.cancellation;
  if (!c) return [];
  return [
    { label: '취소 주체', value: cancelActorLabel(c.actorType) },
    { label: '취소 사유', value: c.reasonLabel },
    { label: '환불 금액', value: formatKrw(c.refundAmount) },
    ...(c.refundStatus ? [{ label: '환불 상태', value: refundStatusLabel(c.refundStatus) }] : []),
  ];
}
