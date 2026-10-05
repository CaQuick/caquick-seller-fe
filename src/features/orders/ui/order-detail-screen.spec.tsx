import { notifyManager } from '@tanstack/react-query';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type Sink } from 'graphql-ws';
import { graphql, HttpResponse } from 'msw';
import { type ReactNode } from 'react';
import { Linking, Text } from 'react-native';
import { toast } from 'sonner-native';

import {
  type OrderStatusType,
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
      ],
      freeEdits: [
        {
          id: 'f1',
          cropImageUrl: 'https://img/crop.jpg',
          descriptionText: '크림은 연한 핑크로 부탁드려요',
          sortOrder: 1,
          attachments: [{ id: 'a1', imageUrl: 'https://img/ref.jpg', sortOrder: 1 }],
        },
      ],
    },
  ],
  statusHistories: [],
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
    expect(screen.getByLabelText('자유 편집 이미지-2')).toBeTruthy();
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

  it.each<[OrderStatusType, string | null, boolean, string | null]>([
    ['SUBMITTED', '주문 확정', true, null],
    ['CONFIRMED', '제작 완료', true, null],
    ['MADE', '픽업 완료', false, null],
    ['PICKED_UP', null, false, '픽업이 끝난 주문이에요. 더 할 수 있는 작업이 없어요.'],
    [
      'CANCELED',
      null,
      false,
      '취소된 주문이에요. 구매자에게 사유가 전달되었고 결제는 취소되었어요.',
    ],
  ])('%s 액션바: 다음 %s · 취소 %s · 안내 %s', async (status, next, cancellable, notice) => {
    detailHandler(() => order({ status }));
    await open();
    await screen.findByText('10월 8일 (목) 15:30');
    for (const label of ['주문 확정', '제작 완료', '픽업 완료']) {
      expect(screen.queryByRole('button', { name: label }) !== null).toBe(label === next);
    }
    expect(screen.queryByRole('button', { name: '주문 취소' }) !== null).toBe(cancellable);
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

  it('취소는 사유가 비어 있으면 확정할 수 없고, 사유를 다듬어 보낸다', async () => {
    detailHandler(() => order());
    const inputs = mutationHandler();
    await open();
    await screen.findByRole('button', { name: '주문 취소' });
    const confirm = () => button('취소 확정');
    expect(confirm()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('취소 사유'), '   ');
    expect(confirm()).toBeDisabled();
    await fireEvent.press(confirm());
    expect(inputs).toHaveLength(0);

    await fireEvent.changeText(screen.getByLabelText('취소 사유'), ' 딸기 입고 지연 ');
    await fireEvent.press(confirm());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('주문을 취소했어요'));
    expect(inputs).toEqual([{ orderId: '1', toStatus: 'CANCELED', note: '딸기 입고 지연' }]);
    expect(screen.getByLabelText('취소 사유')).toHaveDisplayValue('');
  });

  it('취소할 수 없는 상태면 그 문구를 띄운다', async () => {
    detailHandler(() => order());
    mutationHandler(failWith('ORDER_NOT_CANCELLABLE'));
    await open();
    await screen.findByRole('button', { name: '주문 취소' });
    await fireEvent.changeText(screen.getByLabelText('취소 사유'), '재료 소진');
    await fireEvent.press(button('취소 확정'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('지금 상태에서는 주문을 취소할 수 없어요.'),
    );
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
