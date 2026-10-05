import { type InfiniteData } from '@tanstack/react-query';

import {
  type SellerOrdersListQuery,
  type SellerOrdersUpdatedSubscription,
} from '@/graphql/generated/graphql';

export type OrderUpdate = SellerOrdersUpdatedSubscription['sellerOrderUpdated'];
type ListPage = SellerOrdersListQuery['sellerOrderList'];

/**
 * 도착 순서가 보장되지 않는 구독 이벤트를 orderId별 updatedAt으로 거른다.
 * 이미 본 것과 같거나 오래된 이벤트는 false(폐기)
 */
export function createOrderWatermark() {
  const marks = new Map<string, number>();
  return (update: Pick<OrderUpdate, 'orderId' | 'updatedAt'>): boolean => {
    const at = Date.parse(update.updatedAt);
    const seen = marks.get(update.orderId);
    if (seen !== undefined && at <= seen) return false;
    marks.set(update.orderId, at);
    return true;
  };
}

/** 이미 받은 목록 페이지에 이벤트를 반영. 상태 필터와 어긋나게 된 주문은 뺀다. 없으면 null */
export function applyOrderUpdate(
  data: InfiniteData<ListPage, string | null>,
  update: OrderUpdate,
  statusFilter: string | undefined,
): InfiniteData<ListPage, string | null> | null {
  let found = false;
  const drop = statusFilter !== undefined && statusFilter !== update.status;
  const pages = data.pages.map((page) => {
    if (!page.items.some((item) => item.id === update.orderId)) return page;
    found = true;
    if (drop) {
      return { ...page, items: page.items.filter((item) => item.id !== update.orderId) };
    }
    return {
      ...page,
      items: page.items.map((item) =>
        item.id === update.orderId
          ? {
              ...item,
              status: update.status,
              pickupAt: update.pickupAt,
              buyerName: update.buyerName,
              totalPrice: update.totalPrice,
            }
          : item,
      ),
    };
  });
  return found ? { ...data, pages } : null;
}
