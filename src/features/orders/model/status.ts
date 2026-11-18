import { type OrderStatusType, type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { enumView } from '@/shared/lib/enum-view';
import { type StatusTone, type TimelineItem } from '@/shared/ui';

import { formatDateTime } from './format';

type OrderDetail = SellerOrderDetailQuery['sellerOrder'];

interface StatusView {
  label: string;
  tone: StatusTone;
}

export const orderStatusView = enumView<StatusView>(
  {
    PENDING_PAYMENT: { label: '입금 대기', tone: 'gray' },
    SUBMITTED: { label: '접수', tone: 'gray' },
    CONFIRMED: { label: '확정', tone: 'purple' },
    MADE: { label: '제작 완료', tone: 'mint' },
    PICKED_UP: { label: '픽업 완료', tone: 'done' },
    NO_SHOW: { label: '노쇼', tone: 'red' },
    CANCELED: { label: '취소', tone: 'red' },
  } satisfies Record<OrderStatusType, StatusView>,
  { label: '확인 필요', tone: 'gray' },
);

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

export const orderActions = enumView<OrderActions>(
  {
    PENDING_PAYMENT: {
      cancellable: false,
      notice: '입금 확인 전 주문이에요. 입금이 확인되면 처리할 수 있어요.',
    },
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
    NO_SHOW: {
      cancellable: false,
      notice: '노쇼로 처리된 주문이에요. 더 할 수 있는 작업이 없어요.',
    },
    CANCELED: {
      cancellable: false,
      notice: '취소된 주문이에요. 구매자에게 사유가 전달되었고 결제는 취소되었어요.',
    },
  } satisfies Record<OrderStatusType, OrderActions>,
  { cancellable: false, notice: '앱을 최신 버전으로 업데이트하면 이 주문을 처리할 수 있어요.' },
);

const FLOW = ['SUBMITTED', 'CONFIRMED', 'MADE', 'PICKED_UP'] as const;

/**
 * 4단계 고정 타임라인. 취소·노쇼면 도달한 단계까지만 두고 빨간 종료 행 + 메모.
 * 모르는 상태면 도달한 단계만 두고 현재 단계 행은 만들지 않는다.
 */
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
  const { status } = order;
  const done: TimelineItem[] = FLOW.filter((s) => reachedAt[s]).map((s) => ({
    key: s,
    title: orderStatusView(s).label,
    state: 'done',
    at: at(s),
  }));
  if (status === 'CANCELED' || status === 'NO_SHOW') {
    const endedAt = status === 'CANCELED' ? order.canceledAt : order.noShowAt;
    const note = order.statusHistories.find((h) => h.toStatus === status)?.note ?? undefined;
    return [
      ...done,
      {
        key: status,
        title: orderStatusView(status).label,
        state: 'bad',
        at: endedAt ? formatDateTime(endedAt) : undefined,
        memo: note,
      },
    ];
  }
  const current = FLOW.findIndex((s) => s === status);
  if (current < 0) return done;
  return FLOW.map((s, i) => ({
    key: s,
    title: orderStatusView(s).label,
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
