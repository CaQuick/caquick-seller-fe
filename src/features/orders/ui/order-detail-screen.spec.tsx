import { notifyManager } from '@tanstack/react-query';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type Sink } from 'graphql-ws';
import { graphql, HttpResponse } from 'msw';
import { type ReactNode } from 'react';
import { Linking, Text } from 'react-native';
import { toast } from 'sonner-native';

import {
  type OrderStatusType,
  type SellerCancelOrderInput,
  type SellerOrderConversationsQuery,
  type SellerOrderDetailQuery,
  type SellerUpdateOrderStatusInput,
} from '@/graphql/generated/graphql';
import { gqlError, gqlOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { OrderDetailScreen } from './order-detail-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));
jest.mock('sonner-native', () => ({
  Toaster: () => null,
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
const mockSinks: Sink[] = [];
jest.mock('graphql-ws', () => ({
  createClient: jest.fn(() => ({
    subscribe: jest.fn((_payload: unknown, sink: Sink) => {
      mockSinks.push(sink);
      return jest.fn();
    }),
    on: jest.fn(),
    dispose: jest.fn(),
    terminate: jest.fn(),
  })),
}));

type Order = SellerOrderDetailQuery['sellerOrder'];
type Conversations = SellerOrderConversationsQuery['sellerConversations'];

const order = (patch: Partial<Order> = {}): Order => ({
  id: '1',
  orderNumber: 'ORD-20261005-K7MQ4P',
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
  confirmDeadlineAt: '2026-10-06T11:14:00.000Z',
  autoPickupAt: null,
  canMarkNoShow: false,
  commissionRateBps: 1000,
  expectedPayoutAmount: 34200,
  settlementBaseAmount: null,
  createdAt: '2026-10-05T11:14:00.000Z',
  updatedAt: '2026-10-05T11:14:00.000Z',
  items: [
    {
      id: 'i1',
      productName: '크리스마스 눈사람',
      quantity: 1,
      optionItems: [
        { id: 'o1', groupName: '사이즈', optionTitle: '1호 15cm', priceDelta: 5000 },
        { id: 'o2', groupName: '시트 맛', optionTitle: '초코', priceDelta: 0 },
      ],
      customTexts: [
        { id: 't2', tokenKey: '하단 문구', defaultText: '', valueText: '2026.10.08', sortOrder: 2 },
        {
          id: 't1',
          tokenKey: '상단 문구',
          defaultText: '축하해',
          valueText: '생일 축하해 다은',
          sortOrder: 1,
        },
        { id: 't3', tokenKey: '편지', defaultText: '사랑해', valueText: null, sortOrder: 3 },
      ],
      freeEdits: [
        {
          id: 'f1',
          descriptionText: '크림은 연한 핑크로 부탁드려요',
          sortOrder: 1,
          attachments: [{ id: 'a1', imageUrl: 'https://img/ref.jpg', sortOrder: 1 }],
        },
      ],
    },
  ],
  statusHistories: [],
  cancellation: null,
  ...patch,
});

const conversations = (items: Conversations['items'], nextCursor: string | null = null) => ({
  sellerConversations: { items, hasMore: nextCursor !== null, nextCursor },
});

function detailHandler(get: () => Order) {
  const calls = { count: 0 };
  server.use(
    graphql.query('SellerOrderDetail', () => {
      calls.count += 1;
      return HttpResponse.json({ data: { sellerOrder: get() } });
    }),
  );
  return calls;
}

function mutationHandler(respond?: () => Response | undefined) {
  const inputs: SellerUpdateOrderStatusInput[] = [];
  server.use(
    graphql.mutation<object, { input: SellerUpdateOrderStatusInput }>(
      'SellerUpdateOrderStatus',
      ({ variables }) => {
        inputs.push(variables.input);
        return (
          respond?.() ??
          HttpResponse.json({
            data: { sellerUpdateOrderStatus: { id: '1', status: variables.input.toStatus } },
          })
        );
      },
    ),
  );
  return inputs;
}

function cancelHandler(respond?: () => Response) {
  const inputs: SellerCancelOrderInput[] = [];
  server.use(
    graphql.mutation<object, { input: SellerCancelOrderInput }>(
      'SellerCancelOrder',
      ({ variables }) => {
        inputs.push(variables.input);
        return (
          respond?.() ??
          HttpResponse.json({ data: { sellerCancelOrder: { id: '1', status: 'CANCELED' } } })
        );
      },
    ),
  );
  return inputs;
}

const failWith = (code: string) => () =>
  HttpResponse.json({
    data: null,
    errors: [
      { message: 'x', extensions: { code, classification: 'BAD_USER_INPUT', statusCode: 400 } },
    ],
  });

function open(conversationItems: Conversations['items'] = []) {
  const queryClient = createTestQueryClient();
  server.use(gqlOk('SellerOrderConversations', conversations(conversationItems)));
  return renderRouter(
    {
      'orders/[id]': OrderDetailScreen,
      orders: () => <Text>목록</Text>,
      'chats/[conversationId]': () => <Text>대화방</Text>,
    },
    {
      initialUrl: '/orders/1',
      wrapper: ({ children }: { children: ReactNode }) => (
        <Providers queryClient={queryClient}>{children}</Providers>
      ),
    },
  );
}

const button = (name: string) => screen.getByRole('button', { name });
const HOUR = 3600_000;
const DAY = 24 * HOUR;

describe('OrderDetailScreen', () => {
  beforeAll(() => notifyManager.setScheduler((cb) => cb()));
  afterAll(() => notifyManager.setScheduler((cb) => setTimeout(cb, 0)));
  beforeEach(() => {
    mockSinks.length = 0;
    jest.mocked(toast).mockClear();
    jest.mocked(toast.success).mockClear();
    jest.mocked(toast.error).mockClear();
  });

  it('주문번호·픽업 일시·품목·금액·이력을 그리고, 채팅 행은 미읽음 대화로 이동한다', async () => {
    detailHandler(() => order());
    const router = open([{ id: 'c7', accountId: '9', unreadCount: 2 }]);
    await router;
    expect(await screen.findByText('10월 8일 (목) 15:30')).toBeTruthy();
    expect(screen.getByText('ORD-20261005-K7MQ4P')).toBeTruthy();
    expect(screen.getByText('10월 5일 (월) 20:14')).toBeTruthy();
    expect(screen.getByText('1호 15cm (+5,000원)')).toBeTruthy();
    expect(screen.getByText('초코 (+0원)')).toBeTruthy();
    expect(screen.getByText('생일 축하해 다은')).toBeTruthy();
    expect(screen.getByText('문구 없음')).toBeTruthy();
    expect(screen.queryByText('사랑해')).toBeNull();
    expect(screen.getByLabelText('자유 편집 이미지-1')).toBeTruthy();
    expect(screen.queryByLabelText('자유 편집 이미지-2')).toBeNull();
    expect(screen.getByText('크림은 연한 핑크로 부탁드려요')).toBeTruthy();
    expect(screen.getByText('33,000원')).toBeTruthy();
    expect(screen.getByText('+5,000원')).toBeTruthy();
    expect(screen.getByText('38,000원')).toBeTruthy();
    expect(screen.getByLabelText('접수, 현재 단계, 10월 5일 20:14 · 김다은')).toBeTruthy();
    expect(screen.getByLabelText('확정, 예정')).toBeTruthy();

    const chat = await screen.findByRole('button', {
      name: '구매자와 채팅, 답변 필요 2건 · 답장하면 읽음 처리',
    });
    await fireEvent.press(chat);
    await waitFor(() => expect(router.getPathname()).toBe('/chats/c7'));
  });

  it('주문자와의 대화가 없으면 이동하지 않고 안내한다', async () => {
    detailHandler(() => order());
    const router = open([{ id: 'c1', accountId: '8', unreadCount: 0 }]);
    await router;
    const chat = await screen.findByRole('button', { name: '구매자와 채팅, 아직 대화가 없어요' });
    await fireEvent.press(chat);
    expect(toast).toHaveBeenCalledWith('아직 대화가 없어요');
    expect(router.getPathname()).toBe('/orders/1');
  });

  it('참고 사진이 없는 자유 편집은 요청 사항만 두고, 빈 문구는 기본 문구로 보인다', async () => {
    detailHandler(() =>
      order({
        items: [
          {
            id: 'i2',
            productName: '레터링 케이크',
            quantity: 1,
            optionItems: [],
            customTexts: [
              { id: 't1', tokenKey: '문구', defaultText: '축하해', valueText: '', sortOrder: 1 },
            ],
            freeEdits: [
              { id: 'f1', descriptionText: '왼쪽에 하트', sortOrder: 1, attachments: [] },
              { id: 'f2', descriptionText: '', sortOrder: 2, attachments: [] },
            ],
          },
        ],
      }),
    );
    await open();
    expect(await screen.findByText('축하해')).toBeTruthy();
    expect(screen.getByText('왼쪽에 하트')).toBeTruthy();
    expect(screen.getByText('요청 사항 1')).toBeTruthy();
    expect(screen.queryByText('요청 사항 2')).toBeNull();
    expect(screen.queryByText(/^자유 편집 이미지/)).toBeNull();
  });

  it('전화 아이콘은 숫자만 남긴 tel: 링크를 열고, 실패하면 알린다', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(true);
    detailHandler(() => order());
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '김다은에게 전화 걸기' }));
    expect(openURL).toHaveBeenCalledWith('tel:01012345678');

    openURL.mockRejectedValueOnce(new Error('no handler'));
    await fireEvent.press(button('김다은에게 전화 걸기'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('전화를 걸 수 없어요'));
  });

  it.each<[OrderStatusType, string | null, string | null, string | null]>([
    ['SUBMITTED', '주문 확정', '거절', null],
    ['CONFIRMED', '제작 완료', '다른 처리', null],
    ['MADE', '픽업 완료', '다른 처리', null],
    ['PENDING_PAYMENT', null, null, '입금 확인 전 주문이에요. 입금이 확인되면 처리할 수 있어요.'],
    ['PICKED_UP', null, null, '픽업이 끝난 주문이에요. 더 할 수 있는 작업이 없어요.'],
    ['CANCELED', null, null, '취소된 주문이에요. 더 할 수 있는 작업이 없어요.'],
    ['NO_SHOW', null, null, '노쇼로 처리된 주문이에요. 더 할 수 있는 작업이 없어요.'],
    [
      'ON_HOLD' as OrderStatusType,
      null,
      null,
      '앱을 최신 버전으로 업데이트하면 이 주문을 처리할 수 있어요.',
    ],
  ])('%s 액션바: 다음 %s · 보조 %s · 안내 %s', async (status, next, secondary, notice) => {
    detailHandler(() => order({ status }));
    await open();
    await screen.findByText('10월 8일 (목) 15:30');
    for (const label of ['주문 확정', '제작 완료', '픽업 완료']) {
      expect(screen.queryByRole('button', { name: label }) !== null).toBe(label === next);
    }
    for (const label of ['거절', '다른 처리']) {
      expect(screen.queryByRole('button', { name: label }) !== null).toBe(label === secondary);
    }
    expect(notice === null || screen.queryByText(notice) !== null).toBe(true);
  });

  it('다음 단계로 바꾸면 토스트를 띄우고 상세를 다시 받는다', async () => {
    let status: OrderStatusType = 'SUBMITTED';
    const calls = detailHandler(() => order({ status }));
    const inputs = mutationHandler(() => {
      status = 'CONFIRMED';
      return undefined;
    });
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '주문 확정' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('주문을 확정했어요'));
    expect(inputs).toEqual([{ orderId: '1', toStatus: 'CONFIRMED' }]);
    expect(await screen.findByRole('button', { name: '제작 완료' })).toBeTruthy();
    expect(calls.count).toBe(2);
  });

  it('전이가 거절되면 코드별 문구를 띄우고 최신 상태를 다시 받는다', async () => {
    const calls = detailHandler(() => order({ status: 'CONFIRMED' }));
    mutationHandler(failWith('INVALID_ORDER_STATUS_TRANSITION'));
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '제작 완료' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '주문 상태가 이미 바뀌었어요. 최신 내용을 확인해 주세요.',
      ),
    );
    await waitFor(() => expect(calls.count).toBe(2));
  });

  it('모르는 상태도 죽지 않고 확인 필요 칩과 도달한 단계만 그린다', async () => {
    detailHandler(() => order({ status: 'ON_HOLD' as OrderStatusType }));
    await open();
    expect(await screen.findByText('확인 필요')).toBeTruthy();
    expect(screen.getByLabelText('접수, 완료, 10월 5일 20:14 · 김다은')).toBeTruthy();
    expect(screen.queryByLabelText(/현재 단계/)).toBeNull();
  });

  it('거절은 사유를 골라야 확정되고, 사유·다듬은 메모로 보내며 전액 환불을 안내한다', async () => {
    detailHandler(() => order());
    const updates = mutationHandler();
    const inputs = cancelHandler();
    await open();
    await screen.findByRole('button', { name: '거절' });
    expect(
      screen.getByText(
        '결제 금액 38,000원 전액이 구매자에게 환불돼요. 환불 송금은 케이퀵이 진행해요.',
      ),
    ).toBeTruthy();
    // 접수 단계 거절에는 사정을 묻지 않는다
    expect(screen.queryByRole('button', { name: '구매자 사정' })).toBeNull();
    expect(button('거절 확정')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('거절 메모'), ' 딸기 입고 지연 ');
    await fireEvent.press(button('거절 확정'));
    expect(inputs).toHaveLength(0);

    await fireEvent.press(button('재료 소진'));
    await fireEvent.press(button('거절 확정'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('주문을 거절했어요'));
    expect(inputs).toEqual([{ orderId: '1', reason: 'OUT_OF_MATERIALS', note: '딸기 입고 지연' }]);
    expect(updates).toHaveLength(0);
    // 성공하면 입력을 비운다
    await waitFor(() => expect(screen.getByLabelText('거절 메모')).toHaveDisplayValue(''));
  });

  it('제작 완료 뒤 취소는 사정을 골라야 하고, 구매자 사정이면 0~결제액 환불 금액을 보낸다', async () => {
    detailHandler(() => order({ status: 'MADE' }));
    const inputs = cancelHandler();
    await open();
    await screen.findByRole('button', { name: '다른 처리' });
    await fireEvent.press(button('일정 불가'));
    expect(button('취소 확정')).toBeDisabled();

    await fireEvent.press(button('구매자 사정'));
    expect(button('취소 확정')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('환불 금액'), '38001');
    expect(screen.getByText('0원부터 38,000원까지 입력할 수 있어요')).toBeTruthy();
    expect(button('취소 확정')).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('환불 금액'), '0');
    expect(
      screen.getByText('환불 0원 · 남은 38,000원은 수수료를 뺀 뒤 매장 정산에 포함돼요'),
    ).toBeTruthy();
    await fireEvent.press(button('취소 확정'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('주문을 취소했어요'));
    expect(inputs).toEqual([
      { orderId: '1', reason: 'SCHEDULE_UNAVAILABLE', fault: 'BUYER', refundAmount: 0 },
    ]);
  });

  it('판매자 사정 취소는 금액 없이 전액 환불로 보낸다', async () => {
    detailHandler(() => order({ status: 'CONFIRMED' }));
    const inputs = cancelHandler();
    await open();
    await screen.findByRole('button', { name: '다른 처리' });
    await fireEvent.press(button('제작할 수 없는 디자인'));
    await fireEvent.press(button('판매자 사정'));
    expect(screen.queryByLabelText('환불 금액')).toBeNull();
    await fireEvent.press(button('취소 확정'));
    await waitFor(() => expect(inputs).toHaveLength(1));
    expect(inputs[0]).toEqual({ orderId: '1', reason: 'DESIGN_NOT_FEASIBLE', fault: 'SELLER' });
  });

  it.each([
    ['CANCEL_REASON_NOT_ALLOWED', '이 주문에는 고를 수 없는 사유예요. 다른 사유를 골라 주세요.'],
    ['CANCEL_FAULT_REQUIRED', '판매자 사정인지 구매자 사정인지 골라 주세요.'],
    ['REFUND_AMOUNT_REQUIRED', '구매자 사정이면 돌려줄 금액을 입력해 주세요.'],
    ['REFUND_AMOUNT_OUT_OF_RANGE', '환불 금액은 0원부터 결제 금액까지 입력할 수 있어요.'],
    ['ORDER_NOT_CANCELLABLE', '지금 상태에서는 주문을 취소할 수 없어요.'],
  ])('취소가 %s로 거절되면 그 문구를 띄운다', async (code, message) => {
    detailHandler(() => order());
    cancelHandler(failWith(code));
    await open();
    await screen.findByRole('button', { name: '거절' });
    await fireEvent.press(button('기타'));
    await fireEvent.press(button('거절 확정'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
  });

  it('확정 주문의 다른 처리: 픽업 완료로 바로 바꾸고, 노쇼는 픽업 전이면 이유를 보이며 누를 수 없다', async () => {
    const pickupAt = new Date(Date.now() + HOUR).toISOString();
    detailHandler(() =>
      order({
        status: 'CONFIRMED',
        pickupAt,
        confirmDeadlineAt: null,
        autoPickupAt: new Date(Date.parse(pickupAt) + DAY).toISOString(),
      }),
    );
    const inputs = mutationHandler();
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '다른 처리' }));
    expect(screen.queryByRole('button', { name: /^노쇼, / })).toBeNull();
    expect(screen.getByText(/^픽업 시각\(.+\)부터 처리할 수 있어요$/)).toBeTruthy();

    await fireEvent.press(button('픽업 완료, 구매자가 주문을 받아 갔어요'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('픽업 완료로 바꿨어요'));
    expect(inputs).toEqual([{ orderId: '1', toStatus: 'PICKED_UP' }]);
  });

  it('노쇼 구간이면 확인 시트를 거쳐 노쇼로 바꾸고, 서버가 막으면 그 문구를 띄운다', async () => {
    const pickupAt = new Date(Date.now() - HOUR).toISOString();
    detailHandler(() =>
      order({
        status: 'MADE',
        pickupAt,
        confirmDeadlineAt: null,
        autoPickupAt: new Date(Date.parse(pickupAt) + DAY).toISOString(),
        canMarkNoShow: true,
      }),
    );
    let fail = true;
    const inputs = mutationHandler(() => (fail ? failWith('NO_SHOW_NOT_ALLOWED')() : undefined));
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '다른 처리' }));
    await fireEvent.press(button('노쇼, 구매자가 픽업 시간에 오지 않았어요'));
    await fireEvent.press(button('노쇼 처리'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '노쇼는 픽업 시각부터 24시간 안에만 처리할 수 있어요.',
      ),
    );
    fail = false;
    await fireEvent.press(button('노쇼 처리'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('노쇼로 처리했어요'));
    expect(inputs).toEqual([
      { orderId: '1', toStatus: 'NO_SHOW' },
      { orderId: '1', toStatus: 'NO_SHOW' },
    ]);
  });

  it('자동 전이 예정·요청 사항·결제 수단·수수료율·정산 예정 금액을 보인다', async () => {
    detailHandler(() => order({ requestNote: '초는 7개 넣어 주세요' }));
    await open();
    expect(
      await screen.findByText('10/6 20:14까지 확정하지 않으면 자동 취소되고 전액 환불돼요'),
    ).toBeTruthy();
    expect(screen.getByText('초는 7개 넣어 주세요')).toBeTruthy();
    expect(screen.getByText('계좌이체')).toBeTruthy();
    expect(screen.getByText('10%')).toBeTruthy();
    expect(screen.getByText('34,200원')).toBeTruthy();
    expect(screen.getByText('픽업 완료 시 확정')).toBeTruthy();
  });

  it('요청 사항이 없으면 그 카드를 두지 않는다', async () => {
    detailHandler(() => order());
    await open();
    await screen.findByText('10월 8일 (목) 15:30');
    expect(screen.queryByRole('header', { name: '요청 사항' })).toBeNull();
  });

  it('확정 주문은 자동 픽업 완료 예정을 안내한다', async () => {
    detailHandler(() =>
      order({
        status: 'CONFIRMED',
        confirmDeadlineAt: null,
        autoPickupAt: '2026-10-09T06:30:00.000Z',
      }),
    );
    await open();
    expect(await screen.findByText('10/9 15:30에 자동으로 픽업 완료돼요')).toBeTruthy();
  });

  it('취소된 주문은 결제 카드에 주체·사유 라벨·환불 금액·환불 상태를 보인다', async () => {
    detailHandler(() =>
      order({
        status: 'CANCELED',
        confirmDeadlineAt: null,
        expectedPayoutAmount: 0,
        cancellation: {
          actorType: 'BUYER',
          reasonLabel: '구매자 요청',
          refundAmount: 38000,
          refundStatus: 'AWAITING_TRANSFER',
        },
      }),
    );
    await open();
    expect(await screen.findByText('구매자 요청')).toBeTruthy();
    expect(screen.getByText('구매자')).toBeTruthy();
    expect(screen.getByText('케이퀵 송금 대기')).toBeTruthy();
    expect(screen.getAllByText('38,000원').length).toBeGreaterThan(1);
    expect(screen.queryByText('픽업 완료 시 확정')).toBeNull();
  });

  it('취소된 주문은 도달한 단계 뒤에 취소 사유를 보여 준다', async () => {
    detailHandler(() =>
      order({
        status: 'CANCELED',
        canceledAt: '2026-10-07T01:20:00.000Z',
        statusHistories: [
          {
            id: 'h1',
            toStatus: 'CANCELED',
            changedAt: '2026-10-07T01:20:00.000Z',
            note: '딸기 입고가 늦어졌어요',
          },
        ],
      }),
    );
    await open();
    expect(await screen.findByText('딸기 입고가 늦어졌어요')).toBeTruthy();
    expect(screen.getByLabelText('취소, 중단, 10월 7일 10:20')).toBeTruthy();
    expect(screen.queryByLabelText(/^확정,/)).toBeNull();
  });

  it('구독 이벤트가 캐시보다 새로우면 상세를 다시 받고, 오래되면 무시한다', async () => {
    const calls = detailHandler(() => order({ updatedAt: '2026-10-06T00:00:00.000Z' }));
    await open();
    await screen.findByText('10월 8일 (목) 15:30');
    const emit = (updatedAt: string) =>
      act(async () => {
        mockSinks.forEach((sink) =>
          sink.next({
            data: {
              sellerOrderUpdated: {
                orderId: '1',
                status: 'CONFIRMED',
                pickupAt: '2026-10-08T06:30:00.000Z',
                buyerName: '김다은',
                totalPrice: 38000,
                productName: '크리스마스 눈사람',
                updatedAt,
              },
            },
          }),
        );
        await Promise.resolve();
      });
    await emit('2026-10-05T23:00:00.000Z');
    expect(calls.count).toBe(1);
    await emit('2026-10-06T00:10:00.000Z');
    await waitFor(() => expect(calls.count).toBe(2));
    expect(toast).not.toHaveBeenCalled();
  });

  it('없는 주문이면 목록으로 돌려보낸다', async () => {
    server.use(
      gqlError('SellerOrderDetail', {
        message: '주문을 찾을 수 없습니다.',
        code: 'ORDER_NOT_FOUND',
        classification: 'NOT_FOUND',
        statusCode: 404,
      }),
    );
    const router = open();
    await router;
    expect(await screen.findByText('주문을 찾을 수 없어요')).toBeTruthy();
    await fireEvent.press(button('목록으로'));
    await waitFor(() => expect(router.getPathname()).toBe('/orders'));
  });

  it('그 밖의 실패는 다시 시도로 다시 받는다', async () => {
    server.use(
      gqlError('SellerOrderDetail', { message: 'x', classification: 'INTERNAL_SERVER_ERROR' }),
    );
    await open();
    expect(await screen.findByText('불러오지 못했어요')).toBeTruthy();
    detailHandler(() => order());
    await fireEvent.press(button('다시 시도'));
    expect(await screen.findByText('10월 8일 (목) 15:30')).toBeTruthy();
  });
});
