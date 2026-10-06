import { homeKeys } from '../api/queryKeys';
import {
  HOME_ORDER_FILTERS,
  ORDER_STATUS_VIEW,
  createOrderWatermark,
  pickupLabel,
  toKpis,
} from './home';

const dashboard = {
  date: '2026-10-06',
  newOrderCount: 5,
  pickupDay: { salesAmount: 1650000 },
  createdDay: { orderCount: 2 },
  remainingCapacity: 12,
  activeProductCount: 18,
  unansweredConversationCount: 3,
};

describe('toKpis', () => {
  it('대시보드 응답을 시안 KPI 4칸(값·보조·이동 탭)으로 바꾼다', () => {
    expect(toKpis(dashboard)).toEqual([
      { label: '신규주문', value: '5건', hint: '+2', href: '/orders' },
      { label: '오늘 매출', value: '1,650,000원', hint: '정산예정', href: '/orders' },
      { label: '판매 중 상품', value: '18개', hint: '활성', href: '/products' },
      { label: '대화 요청', value: '3건', hint: '답변 필요', href: '/chats' },
    ]);
  });

  it('신규주문 보조는 기준일 생성 건수이고 0이면 +0이다', () => {
    const kpis = toKpis({ ...dashboard, newOrderCount: 9, createdDay: { orderCount: 0 } });
    expect(kpis[0]).toMatchObject({ value: '9건', hint: '+0' });
  });
});

describe('pickupLabel', () => {
  // 2026-10-06 10:00 KST
  const now = new Date('2026-10-06T01:00:00.000Z');

  it.each([
    ['2026-10-06T06:30:00.000Z', '오늘 15:30 픽업'],
    ['2026-10-06T14:59:00.000Z', '오늘 23:59 픽업'],
    ['2026-10-06T15:00:00.000Z', '내일 00:00 픽업'],
    ['2026-10-05T14:59:00.000Z', '어제 23:59 픽업'],
    ['2026-10-08T02:05:00.000Z', '10/8 11:05 픽업'],
    ['2026-10-04T09:00:00.000Z', '10/4 18:00 픽업'],
  ])('%s → %s (KST 날짜 경계)', (iso, label) => {
    expect(pickupLabel(iso, now)).toBe(label);
  });
});

describe('createOrderWatermark', () => {
  const event = (orderId: string, updatedAt: string) => ({ orderId, updatedAt });

  it('같은 주문의 더 새 이벤트만 받는다', () => {
    const accept = createOrderWatermark();
    expect(accept(event('1', '2026-10-06T01:00:00.000Z'))).toBe(true);
    expect(accept(event('1', '2026-10-06T01:00:01.000Z'))).toBe(true);
  });

  it('늦게 도착한 오래된 이벤트와 중복 이벤트는 버린다', () => {
    const accept = createOrderWatermark();
    expect(accept(event('1', '2026-10-06T01:00:05.000Z'))).toBe(true);
    expect(accept(event('1', '2026-10-06T01:00:00.000Z'))).toBe(false);
    expect(accept(event('1', '2026-10-06T01:00:05.000Z'))).toBe(false);
  });

  it('워터마크는 주문마다 따로 둔다', () => {
    const accept = createOrderWatermark();
    expect(accept(event('1', '2026-10-06T01:00:05.000Z'))).toBe(true);
    expect(accept(event('2', '2026-10-06T01:00:00.000Z'))).toBe(true);
  });

  it('밀리초 자릿수가 달라도 시각으로 비교한다', () => {
    const accept = createOrderWatermark();
    expect(accept(event('1', '2026-10-06T01:00:00.5Z'))).toBe(true);
    expect(accept(event('1', '2026-10-06T01:00:00.100Z'))).toBe(false);
  });
});

describe('주문 상태 표시', () => {
  it('필터는 전체·접수·확정·제작 완료 순이다(D29)', () => {
    expect(HOME_ORDER_FILTERS.map((f) => [f.label, f.status])).toEqual([
      ['전체', null],
      ['접수', 'SUBMITTED'],
      ['확정', 'CONFIRMED'],
      ['제작 완료', 'MADE'],
    ]);
  });

  it('필터 칩 문구와 상태 칩 문구가 같다', () => {
    for (const { label, status } of HOME_ORDER_FILTERS) {
      if (status) expect(ORDER_STATUS_VIEW[status].label).toBe(label);
    }
  });
});

describe('homeKeys', () => {
  it('최근 주문 키는 상태별로 나뉘고 공통 접두로 한 번에 무효화된다', () => {
    expect(homeKeys.recentOrdersBy('SUBMITTED')).toEqual(['home', 'recentOrders', 'SUBMITTED']);
    expect(homeKeys.recentOrdersBy('ALL').slice(0, 2)).toEqual(homeKeys.recentOrders());
    expect(homeKeys.store()).toEqual(['home', 'store']);
  });
});
