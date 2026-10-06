import { type QueryClient } from '@tanstack/react-query';
import { router as nav } from 'expo-router';
import { act } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { HttpResponse, graphql } from 'msw';

import {
  type SellerHomeDashboardQuery,
  type SellerHomeRecentOrdersQuery,
  type SellerHomeRecentOrdersQueryVariables,
} from '@/graphql/generated/graphql';
import { type SubscriptionSink } from '@/shared/api/ws-client';
import { gqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers, createTestQueryClient } from '@/test/render';

import { pickupLabel } from '../model/home';
import { HomeScreen } from './home-screen';

interface OrderEvent {
  sellerOrderUpdated: { orderId: string; updatedAt: string };
}
const mockSinks: SubscriptionSink<OrderEvent>[] = [];
jest.mock('@/shared/api/ws-client', () => ({
  ...jest.requireActual<object>('@/shared/api/ws-client'),
  subscribe: jest.fn((_doc: unknown, _vars: unknown, sink: SubscriptionSink<OrderEvent>) => {
    mockSinks.push(sink);
    return () => undefined;
  }),
}));

type Dashboard = SellerHomeDashboardQuery['sellerDashboard'];
type Order = SellerHomeRecentOrdersQuery['sellerOrderList']['items'][number];

const dashboard = (over: Partial<Dashboard> = {}): Dashboard => ({
  date: '2026-10-06',
  newOrderCount: 5,
  pickupDay: { salesAmount: 165000 },
  createdDay: { orderCount: 2 },
  remainingCapacity: 12,
  activeProductCount: 18,
  unansweredConversationCount: 3,
  ...over,
});

const order = (id: string, status: Order['status'], name: string | null): Order => ({
  id,
  status,
  pickupAt: '2026-10-06T06:30:00.000Z',
  buyerName: '김다은',
  firstItemName: name,
  firstItemImageUrl: null,
});

const ORDERS = [
  order('7', 'SUBMITTED', '크리스마스 눈사람'),
  order('8', 'CONFIRMED', '크리스마스 트리'),
  order('9', 'MADE', '크리스마스 레터링'),
];

const calls = { store: 0, dashboard: 0, orders: [] as SellerHomeRecentOrdersQueryVariables[] };

function serve({
  isActive = true,
  board = dashboard(),
  orders = ORDERS,
}: { isActive?: boolean; board?: Dashboard; orders?: Order[] } = {}) {
  server.use(
    graphql.query('SellerHomeStore', () => {
      calls.store += 1;
      return HttpResponse.json({
        data: { sellerMyStore: { id: '3', storeName: '해즈 케이크', isActive } },
      });
    }),
    graphql.query('SellerHomeDashboard', () => {
      calls.dashboard += 1;
      return HttpResponse.json({ data: { sellerDashboard: board } });
    }),
    graphql.query<SellerHomeRecentOrdersQuery, SellerHomeRecentOrdersQueryVariables>(
      'SellerHomeRecentOrders',
      ({ variables }) => {
        calls.orders.push(variables);
        const status = variables.input?.status;
        const items = status ? orders.filter((o) => o.status === status) : orders;
        return HttpResponse.json({ data: { sellerOrderList: { items } } });
      },
    ),
  );
}

const stub = (label: string) => () => <Text>{label}</Text>;
let queryClient: QueryClient;

/** RNTL 14의 render는 비동기인데 renderRouter는 결과 Promise에 헬퍼를 얹는다 — async 함수로 감싸지 않는다 */
function open() {
  queryClient = createTestQueryClient();
  return renderRouter(
    {
      index: HomeScreen,
      orders: stub('주문 탭'),
      'orders/[id]': stub('주문 상세'),
      products: stub('상품 탭'),
      'products/new/basic': stub('상품 등록'),
      chats: stub('채팅 탭'),
      'store/daily-capacities': stub('생산 수량'),
    },
    {
      initialUrl: '/',
      wrapper: ({ children }: { children: ReactNode }) => (
        <Providers queryClient={queryClient}>{children}</Providers>
      ),
    },
  );
}

beforeEach(() => {
  mockSinks.length = 0;
  calls.store = 0;
  calls.dashboard = 0;
  calls.orders = [];
});

describe('HomeScreen', () => {
  it('매장·대시보드·최근 주문을 시안 문구로 보여 준다', async () => {
    serve();
    await open();
    expect(await screen.findByText('12개')).toBeTruthy();
    expect(screen.getByRole('header', { name: '판매자 홈' })).toBeTruthy();
    expect(screen.getByLabelText('해즈 케이크, 정상 운영 중')).toBeTruthy();
    expect(screen.getByRole('button', { name: '신규주문 5건, +2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '오늘 매출 165,000원, 정산예정' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '판매 중 상품 18개, 활성' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '대화 요청 3건, 답변 필요' })).toBeTruthy();
    expect(await screen.findByText('크리스마스 눈사람')).toBeTruthy();
    expect(screen.getAllByText(`${pickupLabel(ORDERS[0]!.pickupAt)} · 김다은`)).toHaveLength(3);
    expect(screen.getByRole('button', { name: /^크리스마스 레터링, .+, 제작 완료$/ })).toBeTruthy();
    expect(calls.orders[0]).toEqual({ input: { limit: 5, status: null } });
  });

  it('매장이 비노출이면 운영 중지로 표시한다', async () => {
    serve({ isActive: false });
    await open();
    expect(await screen.findByLabelText('해즈 케이크, 운영 중지')).toBeTruthy();
  });

  it('생산 수량이 설정되지 않았으면(null) 설정 화면으로 안내한다', async () => {
    serve({ board: dashboard({ remainingCapacity: null }) });
    const router = open();
    await router;
    expect(await screen.findByText('오늘 생산 수량을\n설정해 주세요')).toBeTruthy();
    expect(screen.queryByText(/제작 가능/)).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: '생산 수량 설정하기' }));
    await waitFor(() => expect(router.getPathname()).toBe('/store/daily-capacities'));
  });

  it('남은 수량 0은 설정 없음(null)과 다르게 0개로 보여 준다', async () => {
    serve({ board: dashboard({ remainingCapacity: 0 }) });
    await open();
    expect(await screen.findByText('0개')).toBeTruthy();
    expect(screen.queryByText('생산 수량 설정하기')).toBeNull();
  });

  it.each([
    ['주문 확인하기', '/orders'],
    ['신규주문 5건, +2', '/orders'],
    ['판매 중 상품 18개, 활성', '/products'],
    ['대화 요청 3건, 답변 필요', '/chats'],
    ['상품 등록', '/products/new/basic'],
    ['크리스마스 트리, ' + `${pickupLabel(ORDERS[1]!.pickupAt)} · 김다은, 확정`, '/orders/8'],
  ])('"%s"를 누르면 %s로 간다', async (name, path) => {
    serve();
    const router = open();
    await router;
    await screen.findByText('크리스마스 트리');
    await fireEvent.press(screen.getByRole('button', { name }));
    await waitFor(() => expect(router.getPathname()).toBe(path));
  });

  it('필터 칩을 누르면 그 상태로 다시 조회하고, 결과가 없으면 필터 빈 상태를 보여 준다', async () => {
    serve({ orders: ORDERS.slice(0, 2) });
    await open();
    await screen.findByText('크리스마스 눈사람');
    await fireEvent.press(screen.getByRole('button', { name: '확정' }));
    expect(await screen.findByText('크리스마스 트리')).toBeTruthy();
    expect(screen.queryByText('크리스마스 눈사람')).toBeNull();
    expect(screen.getByRole('button', { name: '확정' })).toBeSelected();
    expect(calls.orders.at(-1)).toEqual({ input: { limit: 5, status: 'CONFIRMED' } });

    await fireEvent.press(screen.getByRole('button', { name: '제작 완료' }));
    expect(await screen.findByText('해당 상태의 주문이 없어요')).toBeTruthy();
  });

  it('주문이 하나도 없으면 빈 상태를 보여 준다', async () => {
    serve({ orders: [] });
    await open();
    expect(await screen.findByText('아직 주문이 없어요')).toBeTruthy();
    expect(screen.getByText('새 주문이 들어오면 여기에 표시됩니다')).toBeTruthy();
  });

  it('응답 전에는 스켈레톤을 보여 준다', async () => {
    serve();
    await open();
    expect(screen.getAllByLabelText('불러오는 중').length).toBeGreaterThan(0);
    await screen.findByText('크리스마스 눈사람');
    await screen.findByText('12개');
    expect(screen.queryAllByLabelText('불러오는 중')).toHaveLength(0);
  });

  it('권한 코드 오류는 코드 문구를, 다시 시도하면 대시보드를 다시 받는다', async () => {
    serve();
    server.use(
      gqlError('SellerHomeDashboard', {
        message: 'store missing',
        code: 'STORE_NOT_FOUND',
        classification: 'NOT_FOUND',
        statusCode: 404,
      }),
    );
    await open();
    expect(await screen.findByText('매장 정보를 찾을 수 없습니다.')).toBeTruthy();
    serve();
    await fireEvent.press(screen.getAllByRole('button', { name: '다시 시도' })[0]!);
    expect(await screen.findByText('12개')).toBeTruthy();
  });

  it('네트워크 오류는 연결 안내를 보여 준다', async () => {
    serve();
    server.use(graphql.query('SellerHomeRecentOrders', () => HttpResponse.error()));
    await open();
    expect(await screen.findByText('불러오지 못했어요')).toBeTruthy();
    expect(screen.getByText('네트워크 상태를 확인한 뒤 다시 시도해 주세요')).toBeTruthy();
    expect(await screen.findByText('12개')).toBeTruthy();
  });

  it('주문 이벤트가 오면 대시보드·최근 주문을 다시 받고, 오래된 이벤트는 버린다', async () => {
    serve();
    await open();
    await screen.findByText('크리스마스 눈사람');
    await screen.findByText('12개');
    expect(mockSinks).toHaveLength(1);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const before = { dashboard: calls.dashboard, orders: calls.orders.length, store: calls.store };
    const emit = (updatedAt: string) =>
      act(() => mockSinks[0]!.next({ sellerOrderUpdated: { orderId: '7', updatedAt } }));

    await emit('2026-10-06T01:00:05.000Z');
    await waitFor(() => expect(calls.dashboard).toBe(before.dashboard + 1));
    await waitFor(() => expect(calls.orders).toHaveLength(before.orders + 1));
    expect(calls.store).toBe(before.store);
    expect(invalidate).toHaveBeenCalledTimes(2);

    await emit('2026-10-06T01:00:00.000Z');
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('당겨서 새로고침하면 매장·대시보드·최근 주문을 다시 받는다', async () => {
    serve();
    await open();
    await screen.findByText('크리스마스 눈사람');
    await screen.findByText('12개');
    const before = { store: calls.store, dashboard: calls.dashboard, orders: calls.orders.length };
    const control = screen.getByTestId('home-scroll').props.refreshControl as {
      props: { onRefresh: () => void };
    };
    await act(() => control.props.onRefresh());
    await waitFor(() => expect(calls.store).toBe(before.store + 1));
    expect(calls.dashboard).toBe(before.dashboard + 1);
    expect(calls.orders).toHaveLength(before.orders + 1);
  });

  it('다른 화면에서 돌아오면 다시 받고, 첫 진입은 한 번만 받는다', async () => {
    serve();
    await open();
    await screen.findByText('크리스마스 눈사람');
    await screen.findByText('12개');
    expect(calls.dashboard).toBe(1);
    await act(() => nav.push('/orders/7'));
    expect(await screen.findByText('주문 상세')).toBeTruthy();
    expect(calls.dashboard).toBe(1);
    await act(() => nav.back());
    await waitFor(() => expect(calls.dashboard).toBe(2));
  });
});
