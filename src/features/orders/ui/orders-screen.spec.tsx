import { notifyManager } from '@tanstack/react-query';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { router as navigation } from 'expo-router';
import { type Sink } from 'graphql-ws';
import { delay, graphql, HttpResponse } from 'msw';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { toast } from 'sonner-native';

import { type SellerOrderListInput, type SellerOrdersListQuery } from '@/graphql/generated/graphql';
import { kstToIso, todayKst } from '@/shared/lib/kst';
import { gqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { DEFAULT_FILTERS, toListVars } from '../model/filters';
import { OrdersScreen } from './orders-screen';

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

type Summary = SellerOrdersListQuery['sellerOrderList']['items'][number];
type Page = SellerOrdersListQuery['sellerOrderList'];

const TODAY = todayKst();
const TODAY_NOON = kstToIso({ ...TODAY, hh: 12 });

const summary = (id: string, patch: Partial<Summary> = {}): Summary => ({
  id,
  orderNumber: `ORD-${id}`,
  status: 'SUBMITTED',
  pickupAt: TODAY_NOON,
  buyerName: '김다은',
  totalPrice: 38000,
  firstItemName: `케이크 ${id}`,
  firstItemImageUrl: null,
  ...patch,
});
const page = (items: Summary[], nextCursor: string | null = null): Page => ({
  items,
  totalCount: items.length,
  hasMore: nextCursor !== null,
  nextCursor,
});

/** 요청 input을 모으고, 응답은 respond가 고른다 */
function listHandler(respond: (input: SellerOrderListInput) => Page) {
  const calls: SellerOrderListInput[] = [];
  server.use(
    graphql.query<SellerOrdersListQuery, { input: SellerOrderListInput }>(
      'SellerOrdersList',
      ({ variables }) => {
        calls.push(variables.input);
        return HttpResponse.json({ data: { sellerOrderList: respond(variables.input) } });
      },
    ),
  );
  return calls;
}

function open() {
  const queryClient = createTestQueryClient();
  return renderRouter(
    { orders: OrdersScreen, 'orders/[id]': () => <Text>상세</Text> },
    {
      initialUrl: '/orders',
      wrapper: ({ children }: { children: ReactNode }) => (
        <Providers queryClient={queryClient}>{children}</Providers>
      ),
    },
  );
}

const emit = (update: Record<string, unknown>) =>
  act(async () => {
    mockSinks.forEach((sink) => sink.next({ data: { sellerOrderUpdated: update } }));
    await Promise.resolve();
  });

const row = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name},`) });

describe('OrdersScreen', () => {
  // 캐시 알림을 바로 흘려 구독 반영을 act 안에서 단언한다(기본은 setTimeout 0)
  beforeAll(() => notifyManager.setScheduler((cb) => cb()));
  afterAll(() => notifyManager.setScheduler((cb) => setTimeout(cb, 0)));
  beforeEach(() => {
    mockSinks.length = 0;
    jest.mocked(toast).mockClear();
  });

  it('기본은 이번 주 픽업 20건을 받아 픽업일별로 묶고, 행을 누르면 상세로 간다', async () => {
    const calls = listHandler(() =>
      page([
        summary('1', { firstItemName: null, status: 'MADE' }),
        summary('2', { pickupAt: '2020-01-01T03:00:00.000Z', status: 'CANCELED' }),
      ]),
    );
    const router = open();
    await router;
    expect(await screen.findByRole('header', { name: /^오늘 / })).toHaveTextContent(/· 1건$/);
    expect(calls[0]).toEqual({ ...toListVars(DEFAULT_FILTERS), limit: 20, cursor: null });
    expect(screen.getByRole('header', { name: /^2020년 1월 1일 \(수\) 1건$/ })).toBeTruthy();
    expect(row('ORD-1')).toHaveTextContent(/오늘 12:00 픽업 · 김다은.*38,000원.*제작 완료/);
    expect(row('케이크 2')).toHaveTextContent(/1월 1일 12:00 픽업.*취소/);
    expect(screen.getByRole('tab', { name: '전체' })).toBeSelected();
    expect(screen.getByRole('button', { name: '이번 주' })).toBeSelected();

    await fireEvent.press(row('ORD-1'));
    await waitFor(() => expect(router.getPathname()).toBe('/orders/1'));
    expect(calls).toHaveLength(1);
    await act(() => Promise.resolve(navigation.back()));
    await waitFor(() => expect(calls).toHaveLength(2));
  });

  it('당겨서 새로고침하면 다시 받는다', async () => {
    const calls = listHandler(() => page([summary('1')]));
    await open();
    await screen.findByText('케이크 1');
    const refresh = screen.getByTestId('orders-list').props as {
      refreshControl: { props: { onRefresh: () => Promise<void> } };
    };
    await act(() => refresh.refreshControl.props.onRefresh());
    expect(calls).toHaveLength(2);
  });

  it('응답 전에는 스켈레톤을 보여 준다', async () => {
    server.use(
      graphql.query('SellerOrdersList', async () => {
        await delay(100);
        return HttpResponse.json({ data: { sellerOrderList: page([summary('1')]) } });
      }),
    );
    await open();
    expect(screen.getAllByLabelText('불러오는 중').length).toBeGreaterThan(0);
    expect(await screen.findByText('케이크 1')).toBeTruthy();
  });

  it('실패하면 다시 시도로 다시 받는다', async () => {
    server.use(
      gqlError('SellerOrdersList', {
        message: 'down',
        classification: 'INTERNAL_SERVER_ERROR',
      }),
    );
    await open();
    expect(await screen.findByText('불러오지 못했어요')).toBeTruthy();
    listHandler(() => page([summary('1')]));
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('케이크 1')).toBeTruthy();
  });

  it('조건에 맞는 주문이 없으면 필터 초기화로 모든 조건을 지운다', async () => {
    const calls = listHandler(() => page([]));
    await open();
    expect(await screen.findByText('조건에 맞는 주문이 없어요')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '필터 초기화' }));
    expect(await screen.findByText('아직 들어온 주문이 없어요')).toBeTruthy();
    expect(calls.at(-1)).toEqual({ limit: 20, cursor: null });
    expect(screen.queryByRole('button', { name: '필터 초기화' })).toBeNull();
    expect(screen.getByRole('button', { name: '이번 주' })).not.toBeSelected();
  });

  it('상태 세그먼트·픽업일 칩이 조회 조건을 바꾸고, 선택된 칩을 다시 누르면 픽업일 조건을 뺀다', async () => {
    const calls = listHandler(() => page([summary('1')]));
    await open();
    await screen.findByText('케이크 1');

    await fireEvent.press(screen.getByRole('tab', { name: '취소' }));
    await waitFor(() => expect(calls.at(-1)?.status).toBe('CANCELED'));

    await fireEvent.press(screen.getByRole('button', { name: '오늘' }));
    const today = toListVars({ ...DEFAULT_FILTERS, pickup: 'today' });
    await waitFor(() =>
      expect(calls.at(-1)).toMatchObject({
        status: 'CANCELED',
        fromPickupAt: today.fromPickupAt,
        toPickupAt: today.toPickupAt,
      }),
    );

    await fireEvent.press(screen.getByRole('button', { name: '오늘' }));
    await waitFor(() =>
      expect(calls.at(-1)).toEqual({ status: 'CANCELED', limit: 20, cursor: null }),
    );
  });

  it('검색은 300ms 동안 입력이 멈춘 뒤 마지막 값만 보낸다', async () => {
    const calls = listHandler(() => page([summary('1')]));
    await open();
    await screen.findByText('케이크 1');
    const input = screen.getByLabelText('주문번호·주문자·연락처 검색');
    await fireEvent.changeText(input, '0');
    await fireEvent.changeText(input, '01');
    await fireEvent.changeText(input, '010 ');
    await waitFor(() => expect(calls.at(-1)?.search).toBe('010'));
    expect(calls.map((c) => c.search)).toEqual([undefined, '010']);
  });

  it('직접 고른 픽업 기간은 KST 하루 경계로 보내고 칩에 기간을 보여 준다', async () => {
    const calls = listHandler(() => page([summary('1')]));
    await open();
    await screen.findByText('케이크 1');
    await fireEvent.press(screen.getByRole('button', { name: '기간 선택' }));
    const day = (d: number) => screen.getAllByRole('button', { name: `${TODAY.m}월 ${d}일` })[0]!;
    await fireEvent.press(day(10));
    await fireEvent.press(day(12));
    await fireEvent.press(screen.getByRole('button', { name: '픽업일 기간 적용' }));
    const ymd = (d: number) => ({ y: TODAY.y, m: TODAY.m, d });
    await waitFor(() =>
      expect(calls.at(-1)).toMatchObject({
        fromPickupAt: kstToIso(ymd(10)),
        toPickupAt: new Date(Date.parse(kstToIso(ymd(13))) - 1).toISOString(),
      }),
    );
    expect(screen.getByRole('button', { name: `픽업 ${TODAY.m}/10~${TODAY.m}/12` })).toBeSelected();
    expect(screen.getByRole('button', { name: '이번 주' })).not.toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: '주문일 기간 초기화' }));
    expect(screen.getByRole('button', { name: '주문일 ▾' })).not.toBeSelected();
  });

  it('끝에 닿으면 nextCursor로 다음 페이지를 이어 붙이고, 마지막 페이지에서는 더 부르지 않는다', async () => {
    const calls = listHandler((input) =>
      input.cursor === 'c2' ? page([summary('2')]) : page([summary('1')], 'c2'),
    );
    await open();
    await screen.findByText('케이크 1');
    await fireEvent(screen.getByTestId('orders-list'), 'endReached');
    expect(await screen.findByText('케이크 2')).toBeTruthy();
    expect(calls.map((c) => c.cursor)).toEqual([null, 'c2']);

    await fireEvent(screen.getByTestId('orders-list'), 'endReached');
    expect(calls).toHaveLength(2);
  });

  it('구독 이벤트로 목록의 주문을 고치고, 오래된 이벤트는 버리며, 새 주문은 목록을 다시 받는다(토스트는 전역 리스너 몫)', async () => {
    const calls = listHandler(() => page([summary('1')]));
    await open();
    await screen.findByText('케이크 1');
    expect(mockSinks.length).toBeGreaterThan(0);

    const base = {
      orderId: '1',
      pickupAt: TODAY_NOON,
      buyerName: '김다은',
      totalPrice: 38000,
      productName: '케이크 1',
    };
    await emit({ ...base, status: 'CONFIRMED', updatedAt: '2026-10-06T01:00:00.000Z' });
    expect(row('케이크 1')).toHaveTextContent(/확정/);
    await emit({ ...base, status: 'CANCELED', updatedAt: '2026-10-06T00:59:00.000Z' });
    expect(row('케이크 1')).toHaveTextContent(/확정/);
    expect(calls).toHaveLength(1);

    await emit({
      ...base,
      orderId: '9',
      status: 'SUBMITTED',
      productName: '딸기 타르트',
      pickupAt: '2026-10-12T02:00:00.000Z',
      updatedAt: '2026-10-06T02:00:00.000Z',
    });
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(toast).not.toHaveBeenCalled();
  });
});
