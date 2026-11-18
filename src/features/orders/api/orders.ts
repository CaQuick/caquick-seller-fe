import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import {
  type OrderStatusType,
  type SellerCancelOrderInput,
  type SellerOrderConversationsQuery,
} from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

import { type OrderListFilter, ordersKeys } from './queryKeys';

export const PAGE_SIZE = 20;
const CONVERSATION_PAGE_SIZE = 100;
/** 대화 목록을 넘겨 보는 상한. 넘으면 '대화 없음'으로 본다 */
const CONVERSATION_MAX_PAGES = 5;

const SellerOrdersListDocument = graphql(`
  query SellerOrdersList($input: SellerOrderListInput) {
    sellerOrderList(input: $input) {
      items {
        id
        orderNumber
        status
        pickupAt
        buyerName
        totalPrice
        firstItemName
        firstItemImageUrl
        firstItemCustomImageUrl
        hasCustom
      }
      totalCount
      hasMore
      nextCursor
    }
  }
`);

const SellerOrderDetailDocument = graphql(`
  query SellerOrderDetail($orderId: ID!) {
    sellerOrder(orderId: $orderId) {
      id
      orderNumber
      accountId
      status
      pickupAt
      buyerName
      buyerPhone
      requestNote
      paymentMethod
      subtotalPrice
      discountPrice
      totalPrice
      submittedAt
      confirmedAt
      madeAt
      pickedUpAt
      canceledAt
      noShowAt
      confirmDeadlineAt
      autoPickupAt
      canMarkNoShow
      commissionRateBps
      expectedPayoutAmount
      settlementBaseAmount
      createdAt
      updatedAt
      items {
        id
        productName
        quantity
        optionItems {
          id
          groupName
          optionTitle
          priceDelta
        }
        customTexts {
          id
          tokenKey
          defaultText
          valueText
          sortOrder
        }
        freeEdits {
          id
          descriptionText
          sortOrder
          attachments {
            id
            imageUrl
            sortOrder
          }
        }
      }
      statusHistories {
        id
        toStatus
        changedAt
        note
      }
      cancellation {
        actorType
        reasonLabel
        refundAmount
        refundStatus
      }
    }
  }
`);

const SellerUpdateOrderStatusDocument = graphql(`
  mutation SellerUpdateOrderStatus($input: SellerUpdateOrderStatusInput!) {
    sellerUpdateOrderStatus(input: $input) {
      id
      status
    }
  }
`);

const SellerCancelOrderDocument = graphql(`
  mutation SellerCancelOrder($input: SellerCancelOrderInput!) {
    sellerCancelOrder(input: $input) {
      id
      status
    }
  }
`);

const SellerOrderConversationsDocument = graphql(`
  query SellerOrderConversations($input: CursorInput) {
    sellerConversations(input: $input) {
      items {
        id
        accountId
        unreadCount
      }
      hasMore
      nextCursor
    }
  }
`);

export const SellerOrdersUpdatedDocument = graphql(`
  subscription SellerOrdersUpdated {
    sellerOrderUpdated {
      kind
      orderId
      status
      pickupAt
      buyerName
      totalPrice
      productName
      hasCustom
      updatedAt
    }
  }
`);

export interface OrderListVars extends OrderListFilter {
  status?: OrderStatusType;
}

export const ordersListQueryOptions = (filter: OrderListVars) =>
  infiniteQueryOptions({
    queryKey: ordersKeys.list(filter),
    queryFn: async ({ pageParam }) =>
      (
        await gqlRequest(SellerOrdersListDocument, {
          input: { ...filter, limit: PAGE_SIZE, cursor: pageParam },
        })
      ).sellerOrderList,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });

export const orderDetailQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: ordersKeys.detail(orderId),
    queryFn: async () => (await gqlRequest(SellerOrderDetailDocument, { orderId })).sellerOrder,
  });

/** 주문자 계정과 같은 대화방. BE에 계정으로 찾는 조회가 없어 목록을 넘겨 본다 */
export const orderConversationQueryOptions = (accountId: string) =>
  queryOptions({
    queryKey: ordersKeys.conversation(accountId),
    queryFn: async () => {
      let cursor: string | null = null;
      for (let page = 0; page < CONVERSATION_MAX_PAGES; page += 1) {
        const { sellerConversations: list }: SellerOrderConversationsQuery = await gqlRequest(
          SellerOrderConversationsDocument,
          { input: { limit: CONVERSATION_PAGE_SIZE, cursor } },
        );
        const found = list.items.find((c) => c.accountId === accountId);
        if (found) return found;
        if (!list.hasMore || !list.nextCursor) break;
        cursor = list.nextCursor;
      }
      return null;
    },
  });

export function updateOrderStatus(input: {
  orderId: string;
  toStatus: OrderStatusType;
  note?: string;
}) {
  return gqlRequest(SellerUpdateOrderStatusDocument, { input });
}

export function cancelOrder(input: SellerCancelOrderInput) {
  return gqlRequest(SellerCancelOrderDocument, { input });
}
