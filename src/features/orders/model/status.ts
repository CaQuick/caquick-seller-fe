import { type OrderStatusType, type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { enumView } from '@/shared/lib/enum-view';
import { formatPickupKst } from '@/shared/lib/kst';
import { type StatusTone, type TimelineItem } from '@/shared/ui';

import { type CancelMode } from './cancel-form';
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

/** '다른 처리' 시트의 상태 변경 */
export type OtherStatus = Extract<OrderStatusType, 'PICKED_UP' | 'NO_SHOW'>;

export interface OrderActions {
  /** 다음 단계로 보내는 주 버튼 */
  next?: { to: OrderStatusType; label: string; done: string };
  /** 접수는 '거절' 보조 버튼, 확정·제작 완료는 '다른 처리' 안의 취소 */
  cancel?: CancelMode;
  /** '다른 처리' 시트에 둘 상태 변경 */
  others: readonly OtherStatus[];
  /** 판매자가 픽업 일시를 바꿀 수 있는 상태 */
  reschedule?: true;
  /** 종료 상태 안내 */
  notice?: string;
}

export const orderActions = enumView<OrderActions>(
  {
    PENDING_PAYMENT: {
      others: [],
      notice: '입금 확인 전 주문이에요. 입금이 확인되면 처리할 수 있어요.',
    },
    SUBMITTED: {
      next: { to: 'CONFIRMED', label: '주문 확정', done: '주문을 확정했어요' },
      cancel: 'reject',
      others: [],
      reschedule: true,
    },
    CONFIRMED: {
      next: { to: 'MADE', label: '제작 완료', done: '제작 완료로 바꿨어요' },
      cancel: 'cancel',
      others: ['PICKED_UP', 'NO_SHOW'],
      reschedule: true,
    },
    MADE: {
      next: { to: 'PICKED_UP', label: '픽업 완료', done: '픽업 완료로 바꿨어요' },
      cancel: 'cancel',
      others: ['NO_SHOW'],
      reschedule: true,
    },
    PICKED_UP: {
      others: [],
      notice: '픽업이 끝난 주문이에요. 더 할 수 있는 작업이 없어요.',
    },
    NO_SHOW: {
      others: [],
      notice: '노쇼로 처리된 주문이에요. 더 할 수 있는 작업이 없어요.',
    },
    CANCELED: {
      others: [],
      notice: '취소된 주문이에요. 더 할 수 있는 작업이 없어요.',
    },
  } satisfies Record<OrderStatusType, OrderActions>,
  { others: [], notice: '앱을 최신 버전으로 업데이트하면 이 주문을 처리할 수 있어요.' },
);

/** 자동 전이 예정 안내. BE가 접수에만 확정 마감, 확정·제작 완료에만 자동 픽업 시각을 준다 */
export function autoTransitionNotice(
  order: Pick<OrderDetail, 'confirmDeadlineAt' | 'autoPickupAt'>,
): string | null {
  if (order.confirmDeadlineAt)
    return `${formatPickupKst(order.confirmDeadlineAt)}까지 확정하지 않으면 자동 취소되고 전액 환불돼요`;
  if (order.autoPickupAt) return `${formatPickupKst(order.autoPickupAt)}에 자동으로 픽업 완료돼요`;
  return null;
}

/**
 * 노쇼 처리 가능 여부와 막힌 이유. 구간은 픽업 시각 ≤ now < 자동 픽업 완료 시각이고,
 * 화면을 열어 둔 사이 시각이 바뀌므로 조회 시점의 canMarkNoShow보다 지금 시각으로 판정한다
 */
export function noShowWindow(
  order: Pick<OrderDetail, 'canMarkNoShow' | 'pickupAt' | 'autoPickupAt'>,
  now: Date,
): { enabled: boolean; reason: string } {
  const enabled = { enabled: true, reason: '구매자가 픽업 시간에 오지 않았어요' };
  if (!order.autoPickupAt)
    return order.canMarkNoShow
      ? enabled
      : { enabled: false, reason: '지금은 노쇼로 처리할 수 없어요' };
  if (now.getTime() < Date.parse(order.pickupAt))
    return {
      enabled: false,
      reason: `픽업 시각(${formatPickupKst(order.pickupAt)})부터 처리할 수 있어요`,
    };
  if (now.getTime() >= Date.parse(order.autoPickupAt))
    return { enabled: false, reason: '자동 픽업 완료 시각이 지나 처리할 수 없어요' };
  return enabled;
}

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
