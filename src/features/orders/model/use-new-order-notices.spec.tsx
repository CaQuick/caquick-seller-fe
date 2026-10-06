import { notifyManager } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type Sink } from 'graphql-ws';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { toast } from 'sonner-native';

import { createTestQueryClient, Providers } from '@/test/render';

import { useNewOrderNotices } from './use-new-order-notices';

jest.mock('sonner-native', () => ({ toast: jest.fn() }));
const mockSinks: Sink[] = [];
const mockUnsubscribe = jest.fn();
jest.mock('graphql-ws', () => ({
  createClient: jest.fn(() => ({
    subscribe: jest.fn((_payload: unknown, sink: Sink) => {
      mockSinks.push(sink);
      return mockUnsubscribe;
    }),
    on: jest.fn(),
    dispose: jest.fn(),
    terminate: jest.fn(),
  })),
}));

const queryClient = createTestQueryClient();
function Layout() {
  const [enabled, setEnabled] = useState(true);
  useNewOrderNotices(enabled);
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setEnabled(false)}>
        <Text>로그아웃</Text>
      </Pressable>
      <Slot />
    </>
  );
}
const page = (name: string) => () => <Text>{name}</Text>;
const open = (initialUrl: string) =>
  renderRouter(
    {
      _layout: Layout,
      index: page('홈'),
      products: page('상품'),
      'orders/[id]': page('주문 상세'),
    },
    {
      initialUrl,
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );

const emit = (patch: Record<string, unknown>) =>
  act(async () => {
    mockSinks.forEach((sink) =>
      sink.next({
        data: {
          sellerOrderUpdated: {
            orderId: '9',
            status: 'SUBMITTED',
            pickupAt: '2026-10-12T02:00:00.000Z',
            buyerName: '김다은',
            totalPrice: 38000,
            productName: '딸기 타르트',
            updatedAt: '2026-10-06T02:00:00.000Z',
            ...patch,
          },
        },
      }),
    );
    await Promise.resolve();
  });

describe('useNewOrderNotices', () => {
  beforeAll(() => notifyManager.setScheduler((cb) => cb()));
  afterAll(() => notifyManager.setScheduler((cb) => setTimeout(cb, 0)));
  beforeEach(() => {
    mockSinks.length = 0;
    jest.clearAllMocks();
  });

  it.each([
    ['홈', '/', '11'],
    ['상품', '/products', '12'],
  ])(
    '%s 탭에 있어도 새 주문을 토스트로 알리고 주문·홈을 다시 받게 하며, 누르면 주문 상세로 간다',
    async (_, url, orderId) => {
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const r = open(url);
      await r;
      await emit({ orderId });
      expect(toast).toHaveBeenCalledWith('새 주문: 딸기 타르트 · 픽업 10/12 11:00', {
        onPress: expect.any(Function) as () => void,
      });
      expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([
        ['orders', 'list'],
        ['home'],
      ]);
      await act(() => Promise.resolve(jest.mocked(toast).mock.calls[0]![1]!.onPress!()));
      await waitFor(() => expect(r.getPathname()).toBe(`/orders/${orderId}`));
    },
  );

  it('같은 주문의 이벤트가 다시 와도 한 번만 알린다', async () => {
    await open('/');
    await emit({ orderId: '21' });
    await emit({ orderId: '21', updatedAt: '2026-10-06T02:00:01.000Z' });
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it.each(['CONFIRMED', 'MADE', 'PICKED_UP', 'CANCELED'])(
    '%s 상태 변경은 알리지도 다시 받지도 않는다',
    async (status) => {
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      await open('/');
      await emit({ orderId: `31-${status}`, status });
      expect(toast).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it('꺼지면 구독을 끊고 다시 구독하지 않는다', async () => {
    await open('/');
    expect(mockSinks).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: '로그아웃' }));
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockSinks).toHaveLength(1);
  });
});
