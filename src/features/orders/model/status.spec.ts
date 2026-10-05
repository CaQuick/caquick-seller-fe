import { type OrderStatusType, type SellerOrderDetailQuery } from '@/graphql/generated/graphql';

import { buildTimeline, ORDER_ACTIONS, paymentBreakdown } from './status';

type Order = SellerOrderDetailQuery['sellerOrder'];

const order = (patch: Partial<Order> = {}): Order => ({
  id: '1',
  orderNumber: 'ORD-1',
  accountId: '9',
  status: 'SUBMITTED',
  pickupAt: '2026-10-08T06:30:00.000Z',
  buyerName: '김다은',
  buyerPhone: '010-1234-5678',
  subtotalPrice: 38000,
  discountPrice: 0,
  totalPrice: 38000,
  submittedAt: '2026-10-05T11:14:00.000Z',
  confirmedAt: null,
  madeAt: null,
  pickedUpAt: null,
  canceledAt: null,
  createdAt: '2026-10-05T11:14:00.000Z',
  updatedAt: '2026-10-05T11:14:00.000Z',
  items: [],
  statusHistories: [],
  ...patch,
});

describe('ORDER_ACTIONS', () => {
  it.each<[OrderStatusType, string | undefined, boolean, boolean]>([
    ['SUBMITTED', 'CONFIRMED', true, false],
    ['CONFIRMED', 'MADE', true, false],
    ['MADE', 'PICKED_UP', false, false],
    ['PICKED_UP', undefined, false, true],
    ['CANCELED', undefined, false, true],
  ])('%s → 다음 %s · 취소 %s · 안내 %s', (status, next, cancellable, notice) => {
    const actions = ORDER_ACTIONS[status];
    expect(actions.next?.to).toBe(next);
    expect(actions.cancellable).toBe(cancellable);
    expect(actions.notice !== undefined).toBe(notice);
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
