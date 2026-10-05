import { renderRouter, screen } from 'expo-router/testing-library';

import { OrderDetailScreen } from './order-detail-screen';
import { OrdersScreen } from './orders-screen';

describe('주문 화면 골격', () => {
  it.each([
    ['/orders', '주문이 없습니다'],
    ['/orders/42', '주문 #42의 내용을 불러옵니다.'],
  ])('%s → "%s"', async (url, text) => {
    await renderRouter(
      { orders: OrdersScreen, 'orders/[id]': OrderDetailScreen },
      { initialUrl: url },
    );
    expect(await screen.findByText(text)).toBeTruthy();
  });
});
