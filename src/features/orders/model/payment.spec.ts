import { type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { enumValues } from '@/test/generated-enums';

import {
  cancelActorLabel,
  cancellationRows,
  formatCommissionRate,
  paymentMethodLabel,
  refundStatusLabel,
  settlementRows,
} from './payment';

type Order = SellerOrderDetailQuery['sellerOrder'];

const order = (patch: Partial<Order> = {}): Order => ({
  id: '1',
  orderNumber: 'ORD-1',
  accountId: '9',
  status: 'CONFIRMED',
  pickupAt: '2026-10-08T06:30:00.000Z',
  buyerName: '김다은',
  buyerPhone: '010-1234-5678',
  requestNote: null,
  paymentMethod: 'BANK_TRANSFER',
  subtotalPrice: 38000,
  discountPrice: 0,
  totalPrice: 38000,
  submittedAt: '2026-10-05T11:14:00.000Z',
  confirmedAt: null,
  madeAt: null,
  pickedUpAt: null,
  canceledAt: null,
  noShowAt: null,
  confirmDeadlineAt: null,
  autoPickupAt: null,
  canMarkNoShow: false,
  commissionRateBps: 1000,
  expectedPayoutAmount: 34200,
  settlementBaseAmount: null,
  createdAt: '2026-10-05T11:14:00.000Z',
  updatedAt: '2026-10-05T11:14:00.000Z',
  items: [],
  statusHistories: [],
  cancellation: null,
  pickupChanges: [],
  ...patch,
});

/** 앱이 모르는 값(앱보다 새 BE)과 프로토타입 키 */
const UNKNOWN = ['NEW_VALUE', 'toString', '__proto__'];

describe('enum 표시', () => {
  it.each<[string, (v: never) => string, Record<string, string>, string]>([
    ['PaymentMethodType', paymentMethodLabel, { BANK_TRANSFER: '계좌이체', TOSS: '토스' }, '기타'],
    [
      'RefundStatusType',
      refundStatusLabel,
      {
        AWAITING_ACCOUNT: '구매자 계좌 입력 대기',
        AWAITING_TRANSFER: '케이퀵 송금 대기',
        COMPLETED: '환불 완료',
      },
      '확인 필요',
    ],
    [
      'OrderActorType',
      cancelActorLabel,
      { BUYER: '구매자', SELLER: '매장', ADMIN: '케이퀵', SYSTEM: '자동 취소' },
      '기타',
    ],
  ])('%s: 생성 enum 값 전부를 덮고 모르는 값은 폴백', (name, view, table, fallback) => {
    expect(Object.keys(table).sort()).toEqual([...enumValues(name)].sort());
    for (const [value, label] of Object.entries(table)) expect(view(value as never)).toBe(label);
    for (const value of UNKNOWN) expect(view(value as never)).toBe(fallback);
  });
});

describe('formatCommissionRate', () => {
  it.each([
    [0, '0%'],
    [1, '0.01%'],
    [550, '5.5%'],
    [555, '5.55%'],
    [1000, '10%'],
    [10000, '100%'],
  ])('%s bp → %s', (bps, text) => {
    expect(formatCommissionRate(bps)).toBe(text);
  });
});

describe('settlementRows', () => {
  const rows = (patch: Partial<Order>) =>
    settlementRows(order(patch)).map((r) => [r.label, r.value, r.hint ?? null]);

  it('확정 전이면 정산 예정 금액에 픽업 완료 시 확정을 붙인다', () => {
    expect(rows({})).toEqual([
      ['결제 수단', '계좌이체', null],
      ['접수 일시', '10월 5일 20:14', null],
      ['수수료율', '10%', null],
      ['정산 예정 금액', '34,200원', '픽업 완료 시 확정'],
    ]);
  });

  it('정산이 확정되면 실제 지급액만 보인다', () => {
    expect(
      rows({ status: 'PICKED_UP', settlementBaseAmount: 38000, expectedPayoutAmount: 34200 }).at(
        -1,
      ),
    ).toEqual(['정산 예정 금액', '34,200원', null]);
  });

  it('전액 환불로 끝난 취소는 0원이고 확정 안내를 붙이지 않는다', () => {
    expect(rows({ status: 'CANCELED', expectedPayoutAmount: 0 }).at(-1)).toEqual([
      '정산 예정 금액',
      '0원',
      null,
    ]);
  });

  it('결제 도입 전 주문은 수단·정산 예정 금액을 빼고, 모르는 수단은 기타로 보인다', () => {
    expect(
      rows({
        paymentMethod: null,
        submittedAt: null,
        expectedPayoutAmount: null,
        commissionRateBps: 0,
      }),
    ).toEqual([['수수료율', '0%', null]]);
    expect(rows({ paymentMethod: 'CARD' as never })[0]).toEqual(['결제 수단', '기타', null]);
  });
});

describe('cancellationRows', () => {
  it('취소되지 않았으면 비운다', () => {
    expect(cancellationRows(order())).toEqual([]);
  });

  it('주체·사유 라벨·환불 금액·환불 상태를 보인다', () => {
    expect(
      cancellationRows(
        order({
          status: 'CANCELED',
          cancellation: {
            actorType: 'SELLER',
            reasonLabel: '재료 소진',
            refundAmount: 10000,
            refundStatus: 'AWAITING_ACCOUNT',
          },
        }),
      ),
    ).toEqual([
      { label: '취소 주체', value: '매장' },
      { label: '취소 사유', value: '재료 소진' },
      { label: '환불 금액', value: '10,000원' },
      { label: '환불 상태', value: '구매자 계좌 입력 대기' },
    ]);
  });

  it('환불이 없으면 상태 줄을 뺀다', () => {
    const rows = cancellationRows(
      order({
        status: 'CANCELED',
        cancellation: {
          actorType: 'SYSTEM',
          reasonLabel: '미확정',
          refundAmount: 0,
          refundStatus: null,
        },
      }),
    );
    expect(rows.map((r) => r.label)).toEqual(['취소 주체', '취소 사유', '환불 금액']);
    expect(rows[0]?.value).toBe('자동 취소');
  });
});
