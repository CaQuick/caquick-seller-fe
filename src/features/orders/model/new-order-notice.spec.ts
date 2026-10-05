import { router } from 'expo-router';
import { toast } from 'sonner-native';

import { notifyNewOrder } from './new-order-notice';

jest.mock('sonner-native', () => ({ toast: jest.fn() }));

const pressLast = () => jest.mocked(toast).mock.calls.at(-1)![1]!.onPress!();

describe('notifyNewOrder', () => {
  beforeEach(() => jest.mocked(toast).mockClear());

  it('처음 보는 주문은 누를 수 있는 토스트로 알리고, 누르면 주문 상세로 간다', () => {
    const push = jest.spyOn(router, 'push').mockImplementation(() => undefined);
    expect(notifyNewOrder('0', '딸기 타르트 · 픽업 10/12 11:00')).toBe(true);
    expect(toast).toHaveBeenCalledWith('새 주문: 딸기 타르트 · 픽업 10/12 11:00', {
      onPress: expect.any(Function) as () => void,
    });
    pressLast();
    expect(push).toHaveBeenCalledWith({ pathname: '/orders/[id]', params: { id: '0' } });
    push.mockRestore();
  });

  it('같은 주문은 두 번 알리지 않는다', () => {
    expect(notifyNewOrder('1', '케이크')).toBe(true);
    expect(notifyNewOrder('1', '케이크')).toBe(false);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('요약이 비면 제목만 띄운다', () => {
    notifyNewOrder('2', '');
    expect(toast).toHaveBeenCalledWith('새 주문', expect.anything());
  });

  it('최근 50건만 기억해 가장 오래된 주문부터 잊는다', () => {
    const ids = Array.from({ length: 51 }, (_, i) => `m${i}`);
    ids.forEach((id) => notifyNewOrder(id, '케이크'));
    expect(notifyNewOrder('m50', '케이크')).toBe(false);
    expect(notifyNewOrder('m1', '케이크')).toBe(false);
    expect(notifyNewOrder('m0', '케이크')).toBe(true);
  });
});
