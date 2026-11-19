import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { homeKeys } from '@/features/home';
import { subscribe } from '@/shared/api';

import { SellerOrdersUpdatedDocument } from '../api/orders';
import { ordersKeys } from '../api/queryKeys';
import { newOrderSummary, notifyNewOrder } from './new-order-notice';

/**
 * (app) 레이아웃에서 한 번: 어느 화면에 있든 새 주문(kind SUBMITTED)을 토스트로 알리고 주문·홈을 다시 받게 한다.
 * 상태가 접수여도 픽업 일시 변경 같은 다른 갱신은 새 주문이 아니다.
 * 목록·상세 캐시를 그 자리에서 고치는 일은 화면의 useOrderUpdates 몫
 */
export function useNewOrderNotices(enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    return subscribe(SellerOrdersUpdatedDocument, undefined, {
      next: ({ sellerOrderUpdated: u }) => {
        if (u.kind !== 'SUBMITTED') return;
        if (!notifyNewOrder(u.orderId, newOrderSummary(u))) return;
        void queryClient.invalidateQueries({ queryKey: ordersKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: homeKeys.all });
      },
    });
  }, [enabled, queryClient]);
}
