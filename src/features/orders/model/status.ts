import { type OrderStatusType, type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { type StatusTone, type TimelineItem } from '@/shared/ui';

import { formatDateTime } from './format';

type OrderDetail = SellerOrderDetailQuery['sellerOrder'];

export const STATUS_LABEL: Record<OrderStatusType, string> = {
  SUBMITTED: '접수',
  CONFIRMED: '확정',
  MADE: '제작 완료',
  PICKED_UP: '픽업 완료',
  CANCELED: '취소',
};

export const STATUS_TONE: Record<OrderStatusType, StatusTone> = {
  SUBMITTED: 'gray',
  CONFIRMED: 'purple',
  MADE: 'mint',
  PICKED_UP: 'done',
  CANCELED: 'red',
};

/** 목록 세그먼트 순서. null은 전체 */
export const STATUS_SEGMENTS: readonly OrderStatusType[] = [
  'SUBMITTED',
  'CONFIRMED',
  'MADE',
  'PICKED_UP',
  'CANCELED',
];

export interface OrderActions {
  /** 다음 단계로 보내는 주 버튼 */
  next?: { to: OrderStatusType; label: string; done: string };
  /** 제작 완료 뒤에는 앱에서 취소하지 않는다(만든 케이크 취소는 구매자·관리자 경로) */
  cancellable: boolean;
  /** 종료 상태 안내 */
  notice?: string;
}

export const ORDER_ACTIONS: Record<OrderStatusType, OrderActions> = {
  SUBMITTED: {
    next: { to: 'CONFIRMED', label: '주문 확정', done: '주문을 확정했어요' },
    cancellable: true,
  },
  CONFIRMED: {
    next: { to: 'MADE', label: '제작 완료', done: '제작 완료로 바꿨어요' },
    cancellable: true,
  },
  MADE: {
    next: { to: 'PICKED_UP', label: '픽업 완료', done: '픽업 완료로 바꿨어요' },
    cancellable: false,
  },
  PICKED_UP: {
    cancellable: false,
    notice: '픽업이 끝난 주문이에요. 더 할 수 있는 작업이 없어요.',
  },
  CANCELED: {
    cancellable: false,
    notice: '취소된 주문이에요. 구매자에게 사유가 전달되었고 결제는 취소되었어요.',
  },
};

const FLOW = ['SUBMITTED', 'CONFIRMED', 'MADE', 'PICKED_UP'] as const;

/** 4단계 고정 타임라인. 취소면 도달한 단계까지만 두고 빨간 취소 행 + 사유 */
export function buildTimeline(order: OrderDetail): TimelineItem[] {
  const reachedAt: Record<(typeof FLOW)[number], string | null> = {
    SUBMITTED: order.submittedAt ?? order.createdAt,
    CONFIRMED: order.confirmedAt,
    MADE: order.madeAt,
    PICKED_UP: order.pickedUpAt,
  };
  const at = (status: (typeof FLOW)[number]) => {
    const iso = reachedAt[status];
    if (!iso) return undefined;
    const time = formatDateTime(iso);
    return status === 'SUBMITTED' ? `${time} · ${order.buyerName}` : time;
  };
  if (order.status === 'CANCELED') {
    const done: TimelineItem[] = FLOW.filter((s) => reachedAt[s]).map((s) => ({
      key: s,
      title: STATUS_LABEL[s],
      state: 'done',
      at: at(s),
    }));
    const note = order.statusHistories.find((h) => h.toStatus === 'CANCELED')?.note ?? undefined;
    return [
      ...done,
      {
        key: 'CANCELED',
        title: STATUS_LABEL.CANCELED,
        state: 'bad',
        at: order.canceledAt ? formatDateTime(order.canceledAt) : undefined,
        memo: note,
      },
    ];
  }
  const current = FLOW.indexOf(order.status);
  return FLOW.map((s, i) => ({
    key: s,
    title: STATUS_LABEL[s],
    state: i < current ? 'done' : i === current ? 'now' : 'todo',
    at: i <= current ? at(s) : undefined,
  }));
}

/** 결제 금액 표: 상품 금액은 품목 합계에서 옵션 추가금을 뺀 값이라 총액과 항상 맞는다 */
export function paymentBreakdown(order: OrderDetail) {
  const options = order.items.reduce(
    (sum, item) =>
      sum + item.optionItems.reduce((s, option) => s + option.priceDelta, 0) * item.quantity,
    0,
  );
  return {
    product: order.subtotalPrice - options,
    options,
    discount: order.discountPrice,
    total: order.totalPrice,
  };
}
