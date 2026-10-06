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
 * 없던 목록은 이 주문이 새로 들어갈 수 있는 것(전체·같은 상태 필터)만 다시 받는다.
 * 새 주문 토스트는 useNewOrderNotices 몫
 */
export function useOrderUpdates() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const accept = createOrderWatermark();
    return subscribe(SellerOrdersUpdatedDocument, undefined, {
      next: ({ sellerOrderUpdated: update }) => {
        if (!accept(update)) return;
        for (const [key, data] of queryClient.getQueriesData<ListData>({
          queryKey: ordersKeys.lists(),
        })) {
          const { status } = key[2] as OrderListFilter;
          const next = data && applyOrderUpdate(data, update, status);
          if (next) {
            queryClient.setQueryData(key, next);
          } else if (status === undefined || status === update.status) {
            void queryClient.invalidateQueries({ queryKey: key, exact: true });
          }
        }
        const detail = queryClient.getQueryData(orderDetailQueryOptions(update.orderId).queryKey);
        if (detail && Date.parse(detail.updatedAt) < Date.parse(update.updatedAt)) {
          void queryClient.invalidateQueries({ queryKey: ordersKeys.detail(update.orderId) });
        }
      },
    });
  }, [queryClient]);
}
