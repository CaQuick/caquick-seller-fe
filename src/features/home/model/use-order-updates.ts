import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { subscribe } from '@/shared/api';

import { SellerHomeOrderUpdatedDocument } from '../api/home';
import { homeKeys } from '../api/queryKeys';
import { createOrderWatermark } from './home';

/** 주문 생성·상태 변경 이벤트로 대시보드·최근 주문을 다시 받는다. 이벤트는 누락될 수 있어 당겨서 새로고침이 폴백이다 */
export function useOrderUpdates() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const accept = createOrderWatermark();
    return subscribe(SellerHomeOrderUpdatedDocument, undefined, {
      next: ({ sellerOrderUpdated }) => {
        if (!accept(sellerOrderUpdated)) return;
        void queryClient.invalidateQueries({ queryKey: homeKeys.dashboard() });
        void queryClient.invalidateQueries({ queryKey: homeKeys.recentOrders() });
      },
    });
  }, [queryClient]);
}
