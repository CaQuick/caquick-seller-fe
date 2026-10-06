import { type Href } from 'expo-router';

import { type OrderStatusType, type SellerHomeDashboardQuery } from '@/graphql/generated/graphql';
import { formatCount, formatKrw } from '@/shared/lib/format';
import { addDays, formatYmd, kstParts, todayKst } from '@/shared/lib/kst';
import { type StatusTone } from '@/shared/ui';

type Dashboard = SellerHomeDashboardQuery['sellerDashboard'];

export const HOME_COPY = {
  title: '판매자 홈',
  storeActive: '정상 운영 중',
  storeInactive: '운영 중지',
  checkOrders: '주문 확인하기',
  setCapacity: '생산 수량 설정하기',
  recentOrders: '최근 주문',
  noOrders: '아직 주문이 없어요',
  noOrdersHint: '새 주문이 들어오면 여기에 표시됩니다',
  noFilteredOrders: '해당 상태의 주문이 없어요',
  addProduct: '상품 등록',
  untitledItem: '상품 정보 없음',
} as const;

/** 최근 주문 필터(D29) — null은 전체 */
export const HOME_ORDER_FILTERS: { label: string; status: OrderStatusType | null }[] = [
  { label: '전체', status: null },
  { label: '접수', status: 'SUBMITTED' },
  { label: '확정', status: 'CONFIRMED' },
  { label: '제작 완료', status: 'MADE' },
];

export const ORDER_STATUS_VIEW: Record<OrderStatusType, { label: string; tone: StatusTone }> = {
  SUBMITTED: { label: '접수', tone: 'gray' },
  CONFIRMED: { label: '확정', tone: 'purple' },
  MADE: { label: '제작 완료', tone: 'mint' },
  PICKED_UP: { label: '픽업 완료', tone: 'done' },
  CANCELED: { label: '취소', tone: 'red' },
};

export interface Kpi {
  label: string;
  value: string;
  hint: string;
  href: Href;
}

/** 시안 KPI 4칸(D28) — 카드를 누르면 해당 탭으로 */
export function toKpis(d: Dashboard): Kpi[] {
  return [
    {
      label: '신규주문',
      value: formatCount(d.newOrderCount, '건'),
      hint: `+${formatCount(d.createdDay.orderCount)}`,
      href: '/orders',
    },
    {
      label: '오늘 매출',
      value: formatKrw(d.pickupDay.salesAmount),
      hint: '정산예정',
      href: '/orders',
    },
    {
      label: '판매 중 상품',
      value: formatCount(d.activeProductCount, '개'),
      hint: '활성',
      href: '/products',
    },
    {
      label: '대화 요청',
      value: formatCount(d.unansweredConversationCount, '건'),
      hint: '답변 필요',
      href: '/chats',
    },
  ];
}

const pad = (n: number) => String(n).padStart(2, '0');
const RELATIVE_DAYS: [number, string][] = [
  [0, '오늘'],
  [1, '내일'],
  [-1, '어제'],
];

/** 주문 행 메타 '오늘 15:30 픽업' — 오늘·내일·어제가 아니면 M/d */
export function pickupLabel(iso: string, now: Date = new Date()): string {
  const t = kstParts(iso);
  const today = todayKst(now);
  const day =
    RELATIVE_DAYS.find(([offset]) => formatYmd(addDays(today, offset)) === formatYmd(t))?.[1] ??
    `${t.m}/${t.d}`;
  return `${day} ${pad(t.hh)}:${pad(t.mm)} 픽업`;
}

/**
 * 주문 이벤트 워터마크(orderId별 updatedAt). 도착 순서가 보장되지 않아 같은 주문의 더 오래된·같은 시각 이벤트는 버린다.
 * 받아들이면 true.
 */
export function createOrderWatermark() {
  const marks = new Map<string, number>();
  return ({ orderId, updatedAt }: { orderId: string; updatedAt: string }): boolean => {
    const at = Date.parse(updatedAt);
    const seen = marks.get(orderId);
    if (seen !== undefined && at <= seen) return false;
    marks.set(orderId, at);
    return true;
  };
}
