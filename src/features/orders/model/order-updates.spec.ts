import { type InfiniteData } from '@tanstack/react-query';

import { type SellerOrdersListQuery } from '@/graphql/generated/graphql';

import { applyOrderUpdate, createOrderWatermark, type OrderUpdate } from './order-updates';

type Page = SellerOrdersListQuery['sellerOrderList'];

const summary = (id: string, status: Page['items'][number]['status'] = 'SUBMITTED') => ({
  id,
  orderNumber: `ORD-${id}`,
  status,
  pickupAt: '2026-10-08T06:30:00.000Z',
  buyerName: '김다은',
  totalPrice: 38000,
  firstItemName: '케이크',
  firstItemImageUrl: null,
});
const data = (...pages: Page['items'][]): InfiniteData<Page, string | null> => ({
  pages: pages.map((items) => ({ items, totalCount: 3, hasMore: false, nextCursor: null })),
  pageParams: pages.map((_, i) => (i === 0 ? null : `c${i}`)),
});
const update = (patch: Partial<OrderUpdate> = {}): OrderUpdate => ({
  orderId: '2',
  status: 'CONFIRMED',
  pickupAt: '2026-10-08T06:30:00.000Z',
  buyerName: '김다은',
  totalPrice: 40000,
  productName: '케이크',
  updatedAt: '2026-10-06T00:00:00.000Z',
  ...patch,
});

describe('createOrderWatermark', () => {
  it('주문별 updatedAt이 더 새로울 때만 받는다', () => {
    const accept = createOrderWatermark();
    expect(accept({ orderId: '1', updatedAt: '2026-10-06T00:00:00.000Z' })).toBe(true);
    expect(accept({ orderId: '1', updatedAt: '2026-10-05T23:59:59.000Z' })).toBe(false);
    expect(accept({ orderId: '1', updatedAt: '2026-10-06T00:00:00.000Z' })).toBe(false);
    expect(accept({ orderId: '2', updatedAt: '2026-10-01T00:00:00.000Z' })).toBe(true);
    expect(accept({ orderId: '1', updatedAt: '2026-10-06T00:00:01.000Z' })).toBe(true);
  });

  it('표기가 달라도 같은 시각이면 같은 것으로 본다', () => {
    const accept = createOrderWatermark();
    expect(accept({ orderId: '1', updatedAt: '2026-10-06T09:00:00+09:00' })).toBe(true);
    expect(accept({ orderId: '1', updatedAt: '2026-10-06T00:00:00.000Z' })).toBe(false);
  });
});

describe('applyOrderUpdate', () => {
  it('어느 페이지에 있든 그 주문만 고친다', () => {
    const next = applyOrderUpdate(data([summary('1')], [summary('2')]), update(), undefined);
    expect(next?.pages[0]?.items[0]).toEqual(summary('1'));
    expect(next?.pages[1]?.items[0]).toMatchObject({
      id: '2',
      status: 'CONFIRMED',
      totalPrice: 40000,
    });
    expect(next?.pageParams).toEqual([null, 'c1']);
  });

  it('목록에 없으면 null', () => {
    expect(applyOrderUpdate(data([summary('1')]), update(), undefined)).toBeNull();
  });

  it('상태 필터와 어긋나면 목록에서 뺀다', () => {
    const next = applyOrderUpdate(data([summary('1'), summary('2')]), update(), 'SUBMITTED');
    expect(next?.pages[0]?.items.map((i) => i.id)).toEqual(['1']);
  });

  it('상태 필터와 맞으면 남긴다', () => {
    const next = applyOrderUpdate(data([summary('2', 'SUBMITTED')]), update(), 'CONFIRMED');
    expect(next?.pages[0]?.items).toHaveLength(1);
  });
});
