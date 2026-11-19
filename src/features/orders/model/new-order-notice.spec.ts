import { router } from 'expo-router';
import { toast } from 'sonner-native';

import { newOrderSummary, notifyNewOrder, notifyOrder } from './new-order-notice';

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
});

describe('notifyOrder', () => {
  beforeEach(() => jest.mocked(toast).mockClear());

  it('같은 주문이라도 종류가 다르면 각각 알린다(새 주문 뒤 마감 임박·취소)', () => {
    expect(notifyOrder('ORDER_SUBMITTED', 'k1', '새 주문')).toBe(true);
    expect(notifyOrder('ORDER_CONFIRM_REMINDER', 'k1', '확정 마감 임박')).toBe(true);
    expect(notifyOrder('ORDER_CANCELED', 'k1', '주문 취소')).toBe(true);
    expect(notifyOrder('ORDER_CANCELED', 'k1', '주문 취소')).toBe(false);
    expect(jest.mocked(toast).mock.calls.map(([text]) => text)).toEqual([
      '새 주문',
      '확정 마감 임박',
      '주문 취소',
    ]);
  });

  it('새 주문 알림과 같은 키를 쓴다(구독이 먼저 알렸으면 푸시는 건너뛴다)', () => {
    expect(notifyNewOrder('k2', '케이크')).toBe(true);
    expect(notifyOrder('ORDER_SUBMITTED', 'k2', '새 주문')).toBe(false);
  });

  it('취소 알림도 누르면 주문 상세로 간다', () => {
    const push = jest.spyOn(router, 'push').mockImplementation(() => undefined);
    notifyOrder('ORDER_CANCELED', 'k3', '주문 취소');
    pressLast();
    expect(push).toHaveBeenCalledWith({ pathname: '/orders/[id]', params: { id: 'k3' } });
    push.mockRestore();
  });

  it('최근 50건(종류:주문)만 기억해 가장 오래된 것부터 잊는다', () => {
    const ids = Array.from({ length: 51 }, (_, i) => `m${i}`);
    ids.forEach((id) => notifyOrder('ORDER_CANCELED', id, '주문 취소'));
    expect(notifyOrder('ORDER_CANCELED', 'm50', '주문 취소')).toBe(false);
    expect(notifyOrder('ORDER_CANCELED', 'm1', '주문 취소')).toBe(false);
    expect(notifyOrder('ORDER_CANCELED', 'm0', '주문 취소')).toBe(true);
  });
});

describe('newOrderSummary', () => {
  const submitted = '2026-11-19T01:00:00.000Z'; // KST 10:00
  const at = (ms: number) => new Date(Date.parse(submitted) + ms).toISOString();
  const H = 60 * 60 * 1000;

  it.each([
    ['마감까지 2시간 미만', at(2 * H - 1), ' · 11:59까지 확정'],
    ['마감까지 정확히 2시간', at(2 * H), ' · 12:00까지 확정'],
    ['마감까지 2시간 넘게', at(2 * H + 1), ''],
    ['마감 없음', null, ''],
  ])('%s', (_, confirmDeadlineAt, tail) => {
    expect(
      newOrderSummary({
        productName: '딸기 케이크',
        pickupAt: '2026-11-20T03:00:00.000Z',
        confirmDeadlineAt,
        updatedAt: submitted,
      }),
    ).toBe(`딸기 케이크 · 픽업 11/20 12:00${tail}`);
  });
});
