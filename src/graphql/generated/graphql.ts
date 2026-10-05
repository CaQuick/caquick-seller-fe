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

/** 상품 카테고리 분류. */
export type CategoryType =
  /** 상황·이벤트 기준 분류(생일, 기념일 등). 홈 화면 칩에는 이 분류만 노출된다. */
  | 'EVENT'
  /** 위 둘로 분류되지 않는 그 밖의 분류. 조회 필터로도 쓸 수 있다. */
  | 'OTHER'
  /** 디자인·스타일 기준 분류. */
  | 'STYLE';

/** 대화 메시지 본문 형식. 구매자·판매자 API가 공용으로 쓴다. */
export type ConversationBodyFormat =
  /**
   * 서식이 있는 본문(FAQ 답변 등). 목록 미리보기에서는 태그를 제거해 한 줄로 만든다.
   * 서버 측 sanitize는 아직 적용돼 있지 않다.
   */
  | 'HTML'
  /** 평문. 목록 미리보기에도 원문이 그대로 쓰인다. */
  | 'TEXT';

/** 대화 메시지 발신자 유형. 구매자·판매자 API가 공용으로 쓴다. */
export type ConversationSenderType =
  /** 판매자(매장)가 보낸 메시지. FAQ 질문 칩에 대한 자동응답도 이 값으로 저장된다. */
  | 'STORE'
  /** 시스템이 발신한 메시지. */
  | 'SYSTEM'
  /** 구매자가 보낸 메시지. */
  | 'USER';

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

/** 상품 리뷰 목록 조회 조건. */
export type ProductReviewsInput = {
  /** 이전 페이지의 nextCursor 값(불투명 토큰). 동일 sort에서만 유효. */
  cursor?: string | null | undefined;
  /** 한 번에 가져올 개수. 기본 20, 1~100만 허용하며 벗어나면 BAD_USER_INPUT. */
  limit?: number | null | undefined;
  /** true면 사진(미디어) 있는 리뷰만(사진후기 그리드/사진후기 상세). */
  photoOnly?: boolean | null | undefined;
  productId: string | number;
  /** 정렬 기준. 기본 최신순. 정렬을 바꾸면 기존 cursor는 무효다. */
  sort?: ReviewSort | null | undefined;
};

/** 리뷰 목록 정렬. 상품 리뷰·매장 리뷰가 공용으로 쓴다. */
export type ReviewSort =
  /** 최신순. */
  | 'LATEST'
  /** 좋아요순(동률이면 최신순). */
  | 'LIKES';

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

/** 상품 목록 조회 조건. 필터는 AND로 결합되고 미지정 필터는 적용되지 않는다. */
export type SellerProductListInput = {
  /** 카테고리 필터. 해당 카테고리가 연결된 상품만. */
  categoryId?: string | number | null | undefined;
  /** 이전 응답의 nextCursor. 첫 페이지는 생략한다. */
  cursor?: string | null | undefined;
  /** 노출 여부 필터. 생략하면 서버가 활성 상품만 반환한다(SDL 기본값이 아니라 서비스 기본 동작). */
  isActive?: boolean | null | undefined;
  /** 한 번에 가져올 개수. 기본 20, 1~100만 허용하며 벗어나면 BAD_USER_INPUT. */
  limit?: number | null | undefined;
  /** 상품명 또는 연결된 태그명 부분일치 검색. 둘 중 하나만 맞아도 포함된다. */
  search?: string | null | undefined;
};

/**
 * 판매자 메시지 발송 입력. bodyFormat에 맞는 본문 필드가 비어 있으면 BAD_USER_INPUT.
 * 내 매장의 대화방이 아니면 NOT_FOUND.
 */
export type SellerSendConversationMessageInput = {
  /** 본문 형식. 이 값에 해당하는 본문 필드가 필수다(다른 쪽을 함께 넘기면 그대로 저장된다). */
  bodyFormat: ConversationBodyFormat;
  /** 서식 본문(최대 100000자). bodyFormat이 HTML이면 필수. */
  bodyHtml?: string | null | undefined;
  /** 평문 본문(최대 2000자). bodyFormat이 TEXT면 필수. */
  bodyText?: string | null | undefined;
  conversationId: string | number;
};

/** 상품 노출 여부 변경 입력. */
export type SellerSetProductActiveInput = {
  /** true면 구매자 화면에 노출한다. */
  isActive: boolean;
  productId: string | number;
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

export type SellerChatsConversationsQueryVariables = Exact<{
  input?: CursorInput | null | undefined;
}>;


export type SellerChatsConversationsQuery = { sellerConversations: { totalCount: number, hasMore: boolean, nextCursor: string | null, items: Array<{ id: string, accountId: string, buyerNickname: string | null, lastMessagePreview: string | null, lastMessageAt: string | null, sellerLastReadAt: string | null, unreadCount: number, updatedAt: string }> } };

export type SellerChatsConversationUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type SellerChatsConversationUpdatedSubscription = { sellerConversationUpdated: { conversationId: string, accountId: string, buyerNickname: string | null, lastMessagePreview: string | null, lastMessageAt: string, sellerLastReadAt: string | null, unreadCount: number } };

export type SellerChatsMessagesQueryVariables = Exact<{
  conversationId: string | number;
  input?: CursorInput | null | undefined;
}>;


export type SellerChatsMessagesQuery = { sellerConversationMessages: { totalCount: number, hasMore: boolean, nextCursor: string | null, items: Array<{ id: string, conversationId: string, senderType: ConversationSenderType, senderAccountId: string | null, bodyFormat: ConversationBodyFormat, bodyText: string | null, bodyHtml: string | null, createdAt: string }> } };

export type SellerChatsSendMessageMutationVariables = Exact<{
  input: SellerSendConversationMessageInput;
}>;


export type SellerChatsSendMessageMutation = { sellerSendConversationMessage: { id: string, conversationId: string, senderType: ConversationSenderType, senderAccountId: string | null, bodyFormat: ConversationBodyFormat, bodyText: string | null, bodyHtml: string | null, createdAt: string } };

export type SellerChatsMarkReadMutationVariables = Exact<{
  conversationId: string | number;
}>;


export type SellerChatsMarkReadMutation = { sellerMarkConversationRead: { id: string, accountId: string, buyerNickname: string | null, lastMessagePreview: string | null, lastMessageAt: string | null, sellerLastReadAt: string | null, unreadCount: number, updatedAt: string } };

export type SellerChatsMessageAddedSubscriptionVariables = Exact<{
  conversationId: string | number;
}>;


export type SellerChatsMessageAddedSubscription = { conversationMessageAdded: { id: string, conversationId: string, senderType: ConversationSenderType, bodyFormat: ConversationBodyFormat, bodyText: string | null, bodyHtml: string | null, createdAt: string } };

export type SellerChatsBuyerOrderQueryVariables = Exact<{
  input?: SellerOrderListInput | null | undefined;
}>;


export type SellerChatsBuyerOrderQuery = { sellerOrderList: { items: Array<{ id: string, buyerName: string, pickupAt: string, firstItemName: string | null }> } };

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

export type SellerProductsListQueryVariables = Exact<{
  input?: SellerProductListInput | null | undefined;
}>;


export type SellerProductsListQuery = { sellerProducts: { totalCount: number, hasMore: boolean, nextCursor: string | null, items: Array<{ id: string, name: string, regularPrice: number, salePrice: number | null, isActive: boolean, images: Array<{ id: string, imageUrl: string }>, categories: Array<{ id: string, name: string }> }> } };

export type SellerProductDetailQueryVariables = Exact<{
  productId: string | number;
}>;


export type SellerProductDetailQuery = { sellerProduct: { id: string, name: string, description: string | null, purchaseNotice: string | null, regularPrice: number, salePrice: number | null, preparationTimeMinutes: number, isActive: boolean, images: Array<{ id: string, imageUrl: string, sortOrder: number }>, categories: Array<{ id: string, name: string }>, tags: Array<{ id: string, name: string }>, optionGroups: Array<{ id: string, name: string, isRequired: boolean, minSelect: number, maxSelect: number, isActive: boolean, optionItems: Array<{ id: string }> }>, customTemplate: { id: string, isActive: boolean, textTokens: Array<{ id: string }> } | null } };

export type SellerProductsFilterCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type SellerProductsFilterCategoriesQuery = { categories: Array<{ id: string, name: string, categoryType: CategoryType, sortOrder: number }> };

export type SellerProductBuyerPreviewQueryVariables = Exact<{
  productId: string | number;
  reviews: ProductReviewsInput;
}>;


export type SellerProductBuyerPreviewQuery = { productDetail: { id: string, name: string, description: string | null, purchaseNotice: string | null, images: Array<string>, regularPrice: number, salePrice: number | null, discountRate: number, optionGroups: Array<{ id: string, name: string, description: string | null, items: Array<{ id: string, title: string, description: string | null, priceDelta: number }> }> }, productReviews: { totalCount: number } };

export type SellerProductSetActiveMutationVariables = Exact<{
  input: SellerSetProductActiveInput;
}>;


export type SellerProductSetActiveMutation = { sellerSetProductActive: { id: string, isActive: boolean } };

export type SellerProductDeleteMutationVariables = Exact<{
  productId: string | number;
}>;


export type SellerProductDeleteMutation = { sellerDeleteProduct: boolean };

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
export const SellerChatsConversationsDocument = new TypedDocumentString(`
    query SellerChatsConversations($input: CursorInput) {
  sellerConversations(input: $input) {
    items {
      id
      accountId
      buyerNickname
      lastMessagePreview
      lastMessageAt
      sellerLastReadAt
      unreadCount
      updatedAt
    }
    totalCount
    hasMore
    nextCursor
  }
}
    `) as unknown as TypedDocumentString<SellerChatsConversationsQuery, SellerChatsConversationsQueryVariables>;
export const SellerChatsConversationUpdatedDocument = new TypedDocumentString(`
    subscription SellerChatsConversationUpdated {
  sellerConversationUpdated {
    conversationId
    accountId
    buyerNickname
    lastMessagePreview
    lastMessageAt
    sellerLastReadAt
    unreadCount
  }
}
    `) as unknown as TypedDocumentString<SellerChatsConversationUpdatedSubscription, SellerChatsConversationUpdatedSubscriptionVariables>;
export const SellerChatsMessagesDocument = new TypedDocumentString(`
    query SellerChatsMessages($conversationId: ID!, $input: CursorInput) {
  sellerConversationMessages(conversationId: $conversationId, input: $input) {
    items {
      id
      conversationId
      senderType
      senderAccountId
      bodyFormat
      bodyText
      bodyHtml
      createdAt
    }
    totalCount
    hasMore
    nextCursor
  }
}
    `) as unknown as TypedDocumentString<SellerChatsMessagesQuery, SellerChatsMessagesQueryVariables>;
export const SellerChatsSendMessageDocument = new TypedDocumentString(`
    mutation SellerChatsSendMessage($input: SellerSendConversationMessageInput!) {
  sellerSendConversationMessage(input: $input) {
    id
    conversationId
    senderType
    senderAccountId
    bodyFormat
    bodyText
    bodyHtml
    createdAt
  }
}
    `) as unknown as TypedDocumentString<SellerChatsSendMessageMutation, SellerChatsSendMessageMutationVariables>;
export const SellerChatsMarkReadDocument = new TypedDocumentString(`
    mutation SellerChatsMarkRead($conversationId: ID!) {
  sellerMarkConversationRead(conversationId: $conversationId) {
    id
    accountId
    buyerNickname
    lastMessagePreview
    lastMessageAt
    sellerLastReadAt
    unreadCount
    updatedAt
  }
}
    `) as unknown as TypedDocumentString<SellerChatsMarkReadMutation, SellerChatsMarkReadMutationVariables>;
export const SellerChatsMessageAddedDocument = new TypedDocumentString(`
    subscription SellerChatsMessageAdded($conversationId: ID!) {
  conversationMessageAdded(conversationId: $conversationId) {
    id
    conversationId
    senderType
    bodyFormat
    bodyText
    bodyHtml
    createdAt
  }
}
    `) as unknown as TypedDocumentString<SellerChatsMessageAddedSubscription, SellerChatsMessageAddedSubscriptionVariables>;
export const SellerChatsBuyerOrderDocument = new TypedDocumentString(`
    query SellerChatsBuyerOrder($input: SellerOrderListInput) {
  sellerOrderList(input: $input) {
    items {
      id
      buyerName
      pickupAt
      firstItemName
    }
  }
}
    `) as unknown as TypedDocumentString<SellerChatsBuyerOrderQuery, SellerChatsBuyerOrderQueryVariables>;
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
export const SellerProductsListDocument = new TypedDocumentString(`
    query SellerProductsList($input: SellerProductListInput) {
  sellerProducts(input: $input) {
    items {
      id
      name
      regularPrice
      salePrice
      isActive
      images {
        id
        imageUrl
      }
      categories {
        id
        name
      }
    }
    totalCount
    hasMore
    nextCursor
  }
}
    `) as unknown as TypedDocumentString<SellerProductsListQuery, SellerProductsListQueryVariables>;
export const SellerProductDetailDocument = new TypedDocumentString(`
    query SellerProductDetail($productId: ID!) {
  sellerProduct(productId: $productId) {
    id
    name
    description
    purchaseNotice
    regularPrice
    salePrice
    preparationTimeMinutes
    isActive
    images {
      id
      imageUrl
      sortOrder
    }
    categories {
      id
      name
    }
    tags {
      id
      name
    }
    optionGroups {
      id
      name
      isRequired
      minSelect
      maxSelect
      isActive
      optionItems {
        id
      }
    }
    customTemplate {
      id
      isActive
      textTokens {
        id
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SellerProductDetailQuery, SellerProductDetailQueryVariables>;
export const SellerProductsFilterCategoriesDocument = new TypedDocumentString(`
    query SellerProductsFilterCategories {
  categories {
    id
    name
    categoryType
    sortOrder
  }
}
    `) as unknown as TypedDocumentString<SellerProductsFilterCategoriesQuery, SellerProductsFilterCategoriesQueryVariables>;
export const SellerProductBuyerPreviewDocument = new TypedDocumentString(`
    query SellerProductBuyerPreview($productId: ID!, $reviews: ProductReviewsInput!) {
  productDetail(productId: $productId) {
    id
    name
    description
    purchaseNotice
    images
    regularPrice
    salePrice
    discountRate
    optionGroups {
      id
      name
      description
      items {
        id
        title
        description
        priceDelta
      }
    }
  }
  productReviews(input: $reviews) {
    totalCount
  }
}
    `) as unknown as TypedDocumentString<SellerProductBuyerPreviewQuery, SellerProductBuyerPreviewQueryVariables>;
export const SellerProductSetActiveDocument = new TypedDocumentString(`
    mutation SellerProductSetActive($input: SellerSetProductActiveInput!) {
  sellerSetProductActive(input: $input) {
    id
    isActive
  }
}
    `) as unknown as TypedDocumentString<SellerProductSetActiveMutation, SellerProductSetActiveMutationVariables>;
export const SellerProductDeleteDocument = new TypedDocumentString(`
    mutation SellerProductDelete($productId: ID!) {
  sellerDeleteProduct(productId: $productId)
}
    `) as unknown as TypedDocumentString<SellerProductDeleteMutation, SellerProductDeleteMutationVariables>;
export const PingDocument = new TypedDocumentString(`
    query Ping {
  ping
}
    `) as unknown as TypedDocumentString<PingQuery, PingQueryVariables>;