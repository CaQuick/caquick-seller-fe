import { queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { type OrderStatusType } from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

import { homeKeys } from './queryKeys';

const SellerHomeStoreDocument = graphql(`
  query SellerHomeStore {
    sellerMyStore {
      id
      storeName
      isActive
    }
  }
`);

const SellerHomeDashboardDocument = graphql(`
  query SellerHomeDashboard {
    sellerDashboard {
      date
      newOrderCount
      pickupDay {
        salesAmount
      }
      createdDay {
        orderCount
      }
      remainingCapacity
      activeProductCount
      unansweredConversationCount
    }
  }
`);

const SellerHomeRecentOrdersDocument = graphql(`
  query SellerHomeRecentOrders($input: SellerOrderListInput) {
    sellerOrderList(input: $input) {
      items {
        id
        status
        pickupAt
        buyerName
        firstItemName
        firstItemImageUrl
      }
    }
  }
`);

export const SellerHomeOrderUpdatedDocument = graphql(`
  subscription SellerHomeOrderUpdated {
    sellerOrderUpdated {
      orderId
      updatedAt
    }
  }
`);

export const RECENT_ORDER_LIMIT = 5;

export const storeQueryOptions = () =>
  queryOptions({
    queryKey: homeKeys.store(),
    queryFn: async () => (await gqlRequest(SellerHomeStoreDocument)).sellerMyStore,
  });

/** 탭바 채팅 배지도 같은 키를 읽는다 */
export const dashboardQueryOptions = () =>
  queryOptions({
    queryKey: homeKeys.dashboard(),
    queryFn: async () => (await gqlRequest(SellerHomeDashboardDocument)).sellerDashboard,
  });

export const recentOrdersQueryOptions = (status: OrderStatusType | null) =>
  queryOptions({
    queryKey: homeKeys.recentOrdersBy(status ?? 'ALL'),
    queryFn: async () =>
      (
        await gqlRequest(SellerHomeRecentOrdersDocument, {
          input: { limit: RECENT_ORDER_LIMIT, status },
        })
      ).sellerOrderList.items,
  });
