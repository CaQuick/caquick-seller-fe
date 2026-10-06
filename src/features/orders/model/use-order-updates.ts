import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { type SellerOrdersListQuery } from '@/graphql/generated/graphql';
import { subscribe } from '@/shared/api';

import { orderDetailQueryOptions, SellerOrdersUpdatedDocument } from '../api/orders';
import { type OrderListFilter, ordersKeys } from '../api/queryKeys';
import { applyOrderUpdate, createOrderWatermark } from './order-updates';

type ListData = InfiniteData<SellerOrdersListQuery['sellerOrderList'], string | null>;

/**
 * sellerOrderUpdated로 목록·상세 캐시를 갱신한다. 목록에 있는 주문은 그 자리에서 고치고,
 * 처음 보는 주문(새 주문 등)은 목록을 다시 받는다. 새 주문 토스트는 useNewOrderNotices 몫
 */
export function useOrderUpdates() {
  const queryClient = useQueryClient();
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
      },
    });
  }, [queryClient]);
}
