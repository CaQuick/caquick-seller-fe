/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** 계정 상태. ACTIVE가 아니면 로그인·API 접근이 거부된다. */
export type AccountStatus =
  /** 정상. */
  | 'ACTIVE'
  /** 가입 대기. 현재 생성 경로가 없는 예약값이다. */
  | 'PENDING'
  /** 운영자가 정지한 상태. 모든 API 접근이 FORBIDDEN이고 refresh 세션도 폐기된다. */
  | 'SUSPENDED';

/** 커서 페이지네이션 공통 입력. 필터가 필요한 목록은 같은 두 필드를 가진 전용 input을 쓴다. */
export type CursorInput = {
  /** 이전 페이지의 nextCursor. 불투명 토큰이라 정렬 기준이 바뀌면 무효. 형식이 어긋나면 BAD_USER_INPUT. */
  cursor?: string | null | undefined;
  /** 페이지 크기. 1~100, 기본 20. 벗어나면 BAD_USER_INPUT. */
  limit?: number | null | undefined;
};

/**
 * 주문 상태. 구매자·판매자 API가 공용으로 쓴다.
 *
 * 전이는 `SUBMITTED → CONFIRMED → MADE → PICKED_UP` 한 방향이며 각 단계는 직전
 * 상태에서만 진입할 수 있다. `CANCELED`는 `PICKED_UP` 이전 세 상태에서만 가능하고,
 * 어떤 상태에서도 `SUBMITTED`로 되돌아갈 수 없다.
 */
export type OrderStatusType =
  /** 취소된 종료 상태. 취소 처리에는 사유(note)가 필수다. */
  | 'CANCELED'
  /** 판매자가 주문을 확인·수락한 상태. 제작 대기. */
  | 'CONFIRMED'
  /** 판매자가 제작을 완료해 픽업을 기다리는 상태. "주문 생성됨"이 아니다. */
  | 'MADE'
  /** 구매자가 수령을 마친 종료 상태. 이후 상태 변경 불가. */
  | 'PICKED_UP'
  /** 구매자가 주문을 넣은 직후의 초기 상태. 판매자 확인 대기. */
  | 'SUBMITTED';

/** 주문 목록 조회 조건. 모든 필터는 AND로 결합되고, 미지정 필터는 적용되지 않는다. */
export type SellerOrderListInput = {
  /** 이전 응답의 nextCursor. 첫 페이지는 생략한다. */
  cursor?: string | null | undefined;
  /** 주문 생성 시각 하한(이상). */
  fromCreatedAt?: string | null | undefined;
  /** 픽업 일시 하한(이상). */
  fromPickupAt?: string | null | undefined;
  /** 한 번에 가져올 개수. 기본 20, 1~100만 허용하며 벗어나면 BAD_USER_INPUT. */
  limit?: number | null | undefined;
  /** 주문번호·주문자 이름·연락처 부분일치 검색. 셋 중 하나라도 맞으면 포함된다. */
  search?: string | null | undefined;
  /** 주문 상태 필터. 미지정 시 전체 상태. */
  status?: OrderStatusType | null | undefined;
  /** 주문 생성 시각 상한(이하). */
  toCreatedAt?: string | null | undefined;
  /** 픽업 일시 상한(이하). */
  toPickupAt?: string | null | undefined;
};

/**
 * 주문 상태 변경 입력. 전이 규칙은 OrderStatusType 설명을 따르며, 규칙에 어긋나면
 * BAD_USER_INPUT으로 거절된다.
 */
export type SellerUpdateOrderStatusInput = {
  /** 변경 사유 메모. toStatus가 CANCELED면 필수이고, 없으면 BAD_USER_INPUT. */
  note?: string | null | undefined;
  orderId: string | number;
  /** 변경할 상태. 현재 상태에서 진입 가능한 값이어야 한다. */
  toStatus: OrderStatusType;
};

export type SellerAuthMeQueryVariables = Exact<{ [key: string]: never; }>;


export type SellerAuthMeQuery = { sellerMe: { accountId: string, username: string | null, displayName: string | null, storeId: string | null, mustChangePassword: boolean, accountStatus: AccountStatus } };

export type SellerHomeStoreQueryVariables = Exact<{ [key: string]: never; }>;


export type SellerHomeStoreQuery = { sellerMyStore: { id: string, storeName: string, isActive: boolean } };

export type SellerHomeDashboardQueryVariables = Exact<{ [key: string]: never; }>;


export type SellerHomeDashboardQuery = { sellerDashboard: { date: string, newOrderCount: number, remainingCapacity: number | null, activeProductCount: number, unansweredConversationCount: number, pickupDay: { salesAmount: number }, createdDay: { orderCount: number } } };

export type SellerHomeRecentOrdersQueryVariables = Exact<{
  input?: SellerOrderListInput | null | undefined;
}>;


export type SellerHomeRecentOrdersQuery = { sellerOrderList: { items: Array<{ id: string, status: OrderStatusType, pickupAt: string, buyerName: string, firstItemName: string | null, firstItemImageUrl: string | null }> } };

export type SellerHomeOrderUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type SellerHomeOrderUpdatedSubscription = { sellerOrderUpdated: { orderId: string, updatedAt: string } };

export type SellerOrdersListQueryVariables = Exact<{
  input?: SellerOrderListInput | null | undefined;
}>;


export type SellerOrdersListQuery = { sellerOrderList: { totalCount: number, hasMore: boolean, nextCursor: string | null, items: Array<{ id: string, orderNumber: string, status: OrderStatusType, pickupAt: string, buyerName: string, totalPrice: number, firstItemName: string | null, firstItemImageUrl: string | null }> } };

export type SellerOrderDetailQueryVariables = Exact<{
  orderId: string | number;
}>;


export type SellerOrderDetailQuery = { sellerOrder: { id: string, orderNumber: string, accountId: string, status: OrderStatusType, pickupAt: string, buyerName: string, buyerPhone: string, subtotalPrice: number, discountPrice: number, totalPrice: number, submittedAt: string | null, confirmedAt: string | null, madeAt: string | null, pickedUpAt: string | null, canceledAt: string | null, createdAt: string, updatedAt: string, items: Array<{ id: string, productName: string, quantity: number, optionItems: Array<{ id: string, groupName: string, optionTitle: string, priceDelta: number }>, customTexts: Array<{ id: string, tokenKey: string, defaultText: string, valueText: string, sortOrder: number }>, freeEdits: Array<{ id: string, cropImageUrl: string, descriptionText: string, sortOrder: number, attachments: Array<{ id: string, imageUrl: string, sortOrder: number }> }> }>, statusHistories: Array<{ id: string, toStatus: OrderStatusType, changedAt: string, note: string | null }> } };

export type SellerUpdateOrderStatusMutationVariables = Exact<{
  input: SellerUpdateOrderStatusInput;
}>;


export type SellerUpdateOrderStatusMutation = { sellerUpdateOrderStatus: { id: string, status: OrderStatusType } };

export type SellerOrderConversationsQueryVariables = Exact<{
  input?: CursorInput | null | undefined;
}>;


export type SellerOrderConversationsQuery = { sellerConversations: { hasMore: boolean, nextCursor: string | null, items: Array<{ id: string, accountId: string, unreadCount: number }> } };

export type SellerOrdersUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type SellerOrdersUpdatedSubscription = { sellerOrderUpdated: { orderId: string, status: OrderStatusType, pickupAt: string, buyerName: string, totalPrice: number, productName: string, updatedAt: string } };

export type PingQueryVariables = Exact<{ [key: string]: never; }>;


export type PingQuery = { ping: string };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const SellerAuthMeDocument = new TypedDocumentString(`
    query SellerAuthMe {
  sellerMe {
    accountId
    username
    displayName
    storeId
    mustChangePassword
    accountStatus
  }
}
    `) as unknown as TypedDocumentString<SellerAuthMeQuery, SellerAuthMeQueryVariables>;
export const SellerHomeStoreDocument = new TypedDocumentString(`
    query SellerHomeStore {
  sellerMyStore {
    id
    storeName
    isActive
  }
}
    `) as unknown as TypedDocumentString<SellerHomeStoreQuery, SellerHomeStoreQueryVariables>;
export const SellerHomeDashboardDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SellerHomeDashboardQuery, SellerHomeDashboardQueryVariables>;
export const SellerHomeRecentOrdersDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SellerHomeRecentOrdersQuery, SellerHomeRecentOrdersQueryVariables>;
export const SellerHomeOrderUpdatedDocument = new TypedDocumentString(`
    subscription SellerHomeOrderUpdated {
  sellerOrderUpdated {
    orderId
    updatedAt
  }
}
    `) as unknown as TypedDocumentString<SellerHomeOrderUpdatedSubscription, SellerHomeOrderUpdatedSubscriptionVariables>;
export const SellerOrdersListDocument = new TypedDocumentString(`
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
    }
    totalCount
    hasMore
    nextCursor
  }
}
    `) as unknown as TypedDocumentString<SellerOrdersListQuery, SellerOrdersListQueryVariables>;
export const SellerOrderDetailDocument = new TypedDocumentString(`
    query SellerOrderDetail($orderId: ID!) {
  sellerOrder(orderId: $orderId) {
    id
    orderNumber
    accountId
    status
    pickupAt
    buyerName
    buyerPhone
    subtotalPrice
    discountPrice
    totalPrice
    submittedAt
    confirmedAt
    madeAt
    pickedUpAt
    canceledAt
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
        cropImageUrl
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
  }
}
    `) as unknown as TypedDocumentString<SellerOrderDetailQuery, SellerOrderDetailQueryVariables>;
export const SellerUpdateOrderStatusDocument = new TypedDocumentString(`
    mutation SellerUpdateOrderStatus($input: SellerUpdateOrderStatusInput!) {
  sellerUpdateOrderStatus(input: $input) {
    id
    status
  }
}
    `) as unknown as TypedDocumentString<SellerUpdateOrderStatusMutation, SellerUpdateOrderStatusMutationVariables>;
export const SellerOrderConversationsDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SellerOrderConversationsQuery, SellerOrderConversationsQueryVariables>;
export const SellerOrdersUpdatedDocument = new TypedDocumentString(`
    subscription SellerOrdersUpdated {
  sellerOrderUpdated {
    orderId
    status
    pickupAt
    buyerName
    totalPrice
    productName
    updatedAt
  }
}
    `) as unknown as TypedDocumentString<SellerOrdersUpdatedSubscription, SellerOrdersUpdatedSubscriptionVariables>;
export const PingDocument = new TypedDocumentString(`
    query Ping {
  ping
}
    `) as unknown as TypedDocumentString<PingQuery, PingQueryVariables>;