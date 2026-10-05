import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { type SellerOrdersListQuery } from '@/graphql/generated/graphql';
import { subscribe } from '@/shared/api';

import { orderDetailQueryOptions, SellerOrdersUpdatedDocument } from '../api/orders';
import { type OrderListFilter, ordersKeys } from '../api/queryKeys';
import { applyOrderUpdate, createOrderWatermark, type OrderUpdate } from './order-updates';

type ListData = InfiniteData<SellerOrdersListQuery['sellerOrderList'], string | null>;

/**
 * sellerOrderUpdated로 목록·상세 캐시를 갱신한다. 목록에 있는 주문은 그 자리에서 고치고,
 * 처음 보는 주문(새 주문 등)은 목록을 다시 받는다. SUBMITTED 이벤트는 새 주문뿐이다
 */
export function useOrderUpdates(onNewOrder?: (update: OrderUpdate) => void) {
  const queryClient = useQueryClient();
  const onNewOrderRef = useRef(onNewOrder);
  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  });
  useEffect(() => {
    const accept = createOrderWatermark();
    return subscribe(SellerOrdersUpdatedDocument, undefined, {
      next: ({ sellerOrderUpdated: update }) => {
        if (!accept(update)) return;
        let found = false;
        for (const [key, data] of queryClient.getQueriesData<ListData>({
          queryKey: ordersKeys.lists(),
        })) {
          const next = data && applyOrderUpdate(data, update, (key[2] as OrderListFilter).status);
          if (!next) continue;
          found = true;
          queryClient.setQueryData(key, next);
        }
        if (!found) void queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
        const detail = queryClient.getQueryData(orderDetailQueryOptions(update.orderId).queryKey);
        if (detail && Date.parse(detail.updatedAt) < Date.parse(update.updatedAt)) {
          void queryClient.invalidateQueries({ queryKey: ordersKeys.detail(update.orderId) });
        }
        if (update.status === 'SUBMITTED') onNewOrderRef.current?.(update);
      },
    });
  }, [queryClient]);
}
