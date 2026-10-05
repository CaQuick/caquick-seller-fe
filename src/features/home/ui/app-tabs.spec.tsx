import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import { type ReactNode } from 'react';
import { Text } from 'react-native';

import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { AppTabs } from './app-tabs';

let served = 0;
function serve(unansweredConversationCount: number) {
  served = 0;
  server.use(
    graphql.query('SellerHomeDashboard', () => {
      served += 1;
      return HttpResponse.json({
        data: {
          sellerDashboard: {
            date: '2026-10-06',
            newOrderCount: 0,
            pickupDay: { salesAmount: 0 },
            createdDay: { orderCount: 0 },
            remainingCapacity: null,
            activeProductCount: 0,
            unansweredConversationCount,
          },
        },
      });
    }),
  );
}

const stub = (label: string) => () => <Text>{label}</Text>;

function open() {
  return renderRouter(
    {
      '(tabs)/_layout': AppTabs,
      '(tabs)/index': stub('홈 본문'),
      '(tabs)/orders': stub('주문 본문'),
      '(tabs)/products': stub('상품 본문'),
      '(tabs)/chats': stub('채팅 본문'),
      '(tabs)/store': stub('매장 본문'),
    },
    {
      initialUrl: '/',
      wrapper: ({ children }: { children: ReactNode }) => <Providers>{children}</Providers>,
    },
  );
}

describe('AppTabs', () => {
  it('탭 5개(D27)를 두고, 채팅 탭에 답변이 필요한 대화 수를 배지로 단다', async () => {
    serve(3);
    const router = open();
    await router;
    expect(await screen.findByLabelText('채팅, 답변 필요 3건')).toBeTruthy();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    for (const tab of ['홈', '주문', '상품', '매장'])
      expect(screen.getByLabelText(tab)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('채팅, 답변 필요 3건'));
    await waitFor(() => expect(router.getPathname()).toBe('/chats'));
    expect(screen.getByText('채팅 본문')).toBeTruthy();
  });

  it('답변이 필요한 대화가 없으면 배지를 그리지 않는다', async () => {
    serve(0);
    await open();
    expect(await screen.findByText('홈 본문')).toBeTruthy();
    await waitFor(() => expect(served).toBe(1));
    expect(await screen.findByLabelText('채팅')).toBeTruthy();
    expect(screen.queryAllByText('0')).toHaveLength(0);
  });
});
