import { type OrderStatusType, type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { enumValues } from '@/test/generated-enums';

import {
  autoTransitionNotice,
  buildTimeline,
  noShowWindow,
  orderActions,
  orderStatusView,
  paymentBreakdown,
} from './status';

type Order = SellerOrderDetailQuery['sellerOrder'];

const order = (patch: Partial<Order> = {}): Order => ({
  id: '1',
  orderNumber: 'ORD-1',
  accountId: '9',
  status: 'SUBMITTED',
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

const STATUSES = enumValues('OrderStatusType');
/** 앱이 모르는 상태(앱보다 새 BE)와 프로토타입 키 */
const UNKNOWN = ['ON_HOLD', 'toString', '__proto__'] as unknown as OrderStatusType[];

describe('orderStatusView', () => {
  const table: [string, string, string][] = [
    ['PENDING_PAYMENT', '입금 대기', 'gray'],
    ['SUBMITTED', '접수', 'gray'],
    ['CONFIRMED', '확정', 'purple'],
    ['MADE', '제작 완료', 'mint'],
    ['PICKED_UP', '픽업 완료', 'done'],
    ['NO_SHOW', '노쇼', 'red'],
    ['CANCELED', '취소', 'red'],
  ];

  it('표가 생성 enum 값 전부를 덮는다', () => {
    expect(table.map(([status]) => status).sort()).toEqual([...STATUSES].sort());
  });

  it.each([...table, ...UNKNOWN.map((s) => [s, '확인 필요', 'gray'])])(
    '%s → %s·%s',
    (status, label, tone) => {
      expect(orderStatusView(status)).toEqual({ label, tone });
    },
  );
});

describe('orderActions', () => {
  const UPDATE = '앱을 최신 버전으로 업데이트하면 이 주문을 처리할 수 있어요.';

  it.each<[string, string | undefined, string | undefined, string[], string | null]>([
    [
      'PENDING_PAYMENT',
      undefined,
      undefined,
      [],
      '입금 확인 전 주문이에요. 입금이 확인되면 처리할 수 있어요.',
    ],
    ['SUBMITTED', 'CONFIRMED', 'reject', [], null],
    ['CONFIRMED', 'MADE', 'cancel', ['PICKED_UP', 'NO_SHOW'], null],
    ['MADE', 'PICKED_UP', 'cancel', ['NO_SHOW'], null],
    ['PICKED_UP', undefined, undefined, [], '픽업이 끝난 주문이에요. 더 할 수 있는 작업이 없어요.'],
    ['NO_SHOW', undefined, undefined, [], '노쇼로 처리된 주문이에요. 더 할 수 있는 작업이 없어요.'],
    ['CANCELED', undefined, undefined, [], '취소된 주문이에요. 더 할 수 있는 작업이 없어요.'],
    ...UNKNOWN.map((s): [string, undefined, undefined, string[], string] => [
      s,
      undefined,
      undefined,
      [],
      UPDATE,
    ]),
  ])('%s → 다음 %s · 취소 %s · 다른 처리 %j · 안내 %s', (status, next, cancel, others, notice) => {
    const actions = orderActions(status);
    expect(actions.next?.to).toBe(next);
    expect(actions.cancel).toBe(cancel);
    expect(actions.others).toEqual(others);
    expect(actions.notice ?? null).toBe(notice);
  });

  it('생성 enum 값마다 폴백이 아닌 처리 방법이 있다', () => {
    for (const status of STATUSES) expect(orderActions(status).notice).not.toBe(UPDATE);
  });

  it.each([...STATUSES, ...UNKNOWN])('%s 픽업 일시 변경은 접수·확정·제작 완료만', (status) => {
    expect(orderActions(status).reschedule === true).toBe(
      ['SUBMITTED', 'CONFIRMED', 'MADE'].includes(status),
    );
  });
});

describe('autoTransitionNotice', () => {
  it.each<[string, Partial<Order>, string | null]>([
    [
      '접수: 확정 마감까지 확정하지 않으면 자동 취소',
      { confirmDeadlineAt: '2026-10-06T11:14:00.000Z' },
      '10/6 20:14까지 확정하지 않으면 자동 취소되고 전액 환불돼요',
    ],
    [
      '확정·제작 완료: 자동 픽업 완료',
      { autoPickupAt: '2026-10-09T06:30:00.000Z' },
      '10/9 15:30에 자동으로 픽업 완료돼요',
    ],
    ['예정이 없으면(결제 도입 전 접수·종료 상태) 안내하지 않는다', {}, null],
  ])('%s', (_, patch, expected) => {
    expect(autoTransitionNotice(order(patch))).toBe(expected);
  });
});

describe('noShowWindow', () => {
  const pickupAt = '2026-10-08T06:30:00.000Z';
  const autoPickupAt = '2026-10-09T06:30:00.000Z';
  const at = (iso: string, deltaMs = 0) => new Date(Date.parse(iso) + deltaMs);
  const window = order({ status: 'MADE', pickupAt, autoPickupAt });
  const BEFORE = '픽업 시각(10/8 15:30)부터 처리할 수 있어요';
  const AFTER = '자동 픽업 완료 시각이 지나 처리할 수 없어요';
  const OK = '구매자가 픽업 시간에 오지 않았어요';

  it.each<[string, Date, boolean, string]>([
    ['픽업 1ms 전', at(pickupAt, -1), false, BEFORE],
    ['픽업 시각', at(pickupAt), true, OK],
    ['자동 픽업 1ms 전', at(autoPickupAt, -1), true, OK],
    ['자동 픽업 시각', at(autoPickupAt), false, AFTER],
  ])('%s → %s', (_, now, enabled, reason) => {
    expect(noShowWindow(window, now)).toEqual({ enabled, reason });
  });

  it('조회 시점에 가능했어도 지금 시각이 구간 밖이면 막는다', () => {
    expect(noShowWindow({ ...window, canMarkNoShow: true }, at(autoPickupAt)).enabled).toBe(false);
  });

  it.each([true, false])('자동 픽업 시각이 없으면 서버 판정(%s)을 따른다', (canMarkNoShow) => {
    expect(noShowWindow(order({ autoPickupAt: null, canMarkNoShow }), at(pickupAt)).enabled).toBe(
      canMarkNoShow,
    );
  });
});

describe('buildTimeline', () => {
  const states = (o: Order) => buildTimeline(o).map((i) => `${i.title}:${i.state}`);

  it('현재 단계까지 시각을 붙이고 접수에는 주문자를 덧붙인다', () => {
    const items = buildTimeline(
      order({ status: 'CONFIRMED', confirmedAt: '2026-10-06T00:02:00.000Z' }),
    );
    expect(items.map((i) => [i.title, i.state, i.at])).toEqual([
      ['접수', 'done', '10월 5일 20:14 · 김다은'],
      ['확정', 'now', '10월 6일 09:02'],
      ['제작 완료', 'todo', undefined],
      ['픽업 완료', 'todo', undefined],
    ]);
  });

  it.each<[OrderStatusType, string[]]>([
    ['SUBMITTED', ['접수:now', '확정:todo', '제작 완료:todo', '픽업 완료:todo']],
    ['MADE', ['접수:done', '확정:done', '제작 완료:now', '픽업 완료:todo']],
    ['PICKED_UP', ['접수:done', '확정:done', '제작 완료:done', '픽업 완료:now']],
  ])('%s', (status, expected) => {
    expect(states(order({ status }))).toEqual(expected);
  });

  it('submittedAt이 없으면 주문 생성 시각을 쓴다', () => {
    expect(buildTimeline(order({ submittedAt: null }))[0]?.at).toBe('10월 5일 20:14 · 김다은');
  });

  it('취소면 도달한 단계 뒤에 사유와 함께 취소 행만 두고 이후 단계는 숨긴다', () => {
    const items = buildTimeline(
      order({
        status: 'CANCELED',
        confirmedAt: '2026-10-06T00:02:00.000Z',
        canceledAt: '2026-10-07T01:20:00.000Z',
        statusHistories: [
          {
            id: 'h2',
            toStatus: 'CANCELED',
            changedAt: '2026-10-07T01:20:00.000Z',
            note: '재료 소진',
          },
          { id: 'h1', toStatus: 'CONFIRMED', changedAt: '2026-10-06T00:02:00.000Z', note: null },
        ],
      }),
    );
    expect(items.map((i) => `${i.title}:${i.state}`)).toEqual([
      '접수:done',
      '확정:done',
      '취소:bad',
    ]);
    expect(items.at(-1)).toMatchObject({ at: '10월 7일 10:20', memo: '재료 소진' });
  });

  it('노쇼면 도달한 단계 뒤에 메모와 함께 노쇼 행을 둔다', () => {
    const items = buildTimeline(
      order({
        status: 'NO_SHOW',
        confirmedAt: '2026-10-06T00:02:00.000Z',
        madeAt: '2026-10-07T00:00:00.000Z',
        noShowAt: '2026-10-08T08:00:00.000Z',
        statusHistories: [
          {
            id: 'h3',
            toStatus: 'NO_SHOW',
            changedAt: '2026-10-08T08:00:00.000Z',
            note: '연락 두절',
          },
        ],
      }),
    );
    expect(items.map((i) => `${i.title}:${i.state}`)).toEqual([
      '접수:done',
      '확정:done',
      '제작 완료:done',
      '노쇼:bad',
    ]);
    expect(items.at(-1)).toMatchObject({ at: '10월 8일 17:00', memo: '연락 두절' });
  });

  it.each(UNKNOWN)(
    '모르는 상태(%s)면 도달한 단계만 두고 현재 단계 행을 만들지 않는다',
    (status) => {
      const items = buildTimeline(order({ status, confirmedAt: '2026-10-06T00:02:00.000Z' }));
      expect(items.map((i) => `${i.title}:${i.state}`)).toEqual(['접수:done', '확정:done']);
    },
  );

  it('취소 시각·사유가 비어 있어도 그린다', () => {
    expect(buildTimeline(order({ status: 'CANCELED' })).at(-1)).toEqual({
      key: 'CANCELED',
      title: '취소',
      state: 'bad',
      at: undefined,
      memo: undefined,
    });
  });
});

describe('paymentBreakdown', () => {
  it('옵션 추가금 × 수량을 품목 합계에서 빼 상품 금액을 만든다', () => {
    const option = (priceDelta: number) => ({
      id: `o${priceDelta}`,
      groupName: 'g',
      optionTitle: 't',
      priceDelta,
    });
    const item = (quantity: number, deltas: number[]) => ({
      id: `i${quantity}`,
      productName: '케이크',
      quantity,
      optionItems: deltas.map(option),
      customTexts: [],
      freeEdits: [],
    });
    expect(
      paymentBreakdown(
        order({
          subtotalPrice: 81000,
          discountPrice: 3000,
          totalPrice: 78000,
          items: [item(1, [5000, 0]), item(2, [3000, -1000])],
        }),
      ),
    ).toEqual({ product: 72000, options: 9000, discount: 3000, total: 78000 });
  });
});
