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

/** 지역 자동검색 입력. */
export type SearchRegionsInput = {
  /** 검색어. 1·2차 지역명 모두를 대상으로 부분일치 검색한다. */
  keyword: string;
  /** 한 번에 가져올 개수. 기본 20, 1~50만 허용하며 벗어나면 BAD_USER_INPUT. */
  limit?: number | null | undefined;
};

/** 상품 이미지 추가 입력. */
export type SellerAddProductImageInput = {
  /** 추가할 이미지 URL. sellerCreateUploadUrl(PRODUCT_IMAGE)로 이 계정에 발급된 publicUrl만 허용, 아니면 BAD_USER_INPUT. */
  imageUrl: string;
  productId: string | number;
  /** 노출 순서. 미지정 시 맨 뒤에 붙는다. */
  sortOrder?: number | null | undefined;
};

/** 옵션 그룹 생성 입력. */
export type SellerCreateOptionGroupInput = {
  /** 그룹 안내 문구. */
  description?: string | null | undefined;
  /** 노출 여부. 기본 true. */
  isActive?: boolean | null | undefined;
  /** 필수 선택 여부. 기본 true. false면 0개 선택도 허용된다. */
  isRequired?: boolean | null | undefined;
  /** 최대 선택 개수. 기본 1. minSelect와 함께 허용 개수를 정한다. */
  maxSelect?: number | null | undefined;
  /** 최소 선택 개수. 기본 1. */
  minSelect?: number | null | undefined;
  /** 그룹명. */
  name: string;
  /** 구매자 커스텀 입력(설명)이 필요한 그룹으로 표시한다. 기본 false. 현재는 켜면 해당 옵션 주문이 거절된다. */
  optionRequiresDescription?: boolean | null | undefined;
  /** 구매자 커스텀 입력(이미지)이 필요한 그룹으로 표시한다. 기본 false. 현재는 켜면 해당 옵션 주문이 거절된다. */
  optionRequiresImage?: boolean | null | undefined;
  productId: string | number;
  /** 노출 순서. 오름차순이고 동률의 순서는 보장하지 않는다. 미지정 시 0. */
  sortOrder?: number | null | undefined;
};

/** 옵션 선택지 생성 입력. */
export type SellerCreateOptionItemInput = {
  /** 선택지 설명. */
  description?: string | null | undefined;
  /** 선택지 이미지 URL. sellerCreateUploadUrl(PRODUCT_IMAGE)로 이 계정에 발급된 publicUrl만 허용, 아니면 BAD_USER_INPUT. */
  imageUrl?: string | null | undefined;
  /** 노출 여부. 기본 true. */
  isActive?: boolean | null | undefined;
  optionGroupId: string | number;
  /** 추가 금액(원). 기본 0. 음수면 할인으로 동작하되 품목 금액이 0원 미만이 되면 거절된다. */
  priceDelta?: number | null | undefined;
  /** 노출 순서. 오름차순이고 동률의 순서는 보장하지 않는다. 미지정 시 0. */
  sortOrder?: number | null | undefined;
  /** 선택지 이름. */
  title: string;
};

/**
 * 상품 생성 입력. 이미지·옵션·카테고리는 생성 후 각 전용 mutation으로 붙인다
 * (대표 이미지 1장만 여기서 함께 등록한다).
 */
export type SellerCreateProductInput = {
  /** 커스텀 도안의 바탕 이미지 URL. sellerCreateUploadUrl(PRODUCT_IMAGE)로 이 계정에 발급된 publicUrl만 허용, 아니면 BAD_USER_INPUT. */
  baseDesignImageUrl?: string | null | undefined;
  /** 통화 코드(ISO 4217, 대문자 3자). 기본 KRW. 다른 코드도 저장은 되지만 구매자 주문이 거절된다. */
  currency?: string | null | undefined;
  /** 상품 설명. */
  description?: string | null | undefined;
  /** 대표 이미지 URL. 상품 생성과 함께 첫 이미지로 등록된다. sellerCreateUploadUrl(PRODUCT_IMAGE)로 이 계정에 발급된 publicUrl만 허용, 아니면 BAD_USER_INPUT. */
  initialImageUrl: string;
  /** 노출 여부. 기본 true. */
  isActive?: boolean | null | undefined;
  /** 상품명. */
  name: string;
  /** 제작 소요 시간(분). 기본 180. */
  preparationTimeMinutes?: number | null | undefined;
  /** 구매 전 안내 문구. */
  purchaseNotice?: string | null | undefined;
  /** 정가(원). */
  regularPrice: number;
  /** 할인가(원). 생략하면 할인 없음. */
  salePrice?: number | null | undefined;
};

/** 판매자 업로드 URL 발급 입력. */
export type SellerCreateUploadUrlInput = {
  /** 파일 크기(바이트). 1 이상 5MB 이하, 아니면 BAD_USER_INPUT. */
  contentLength: number;
  /** 파일 MIME 타입. image/jpeg·image/png·image/webp만 허용, 아니면 BAD_USER_INPUT. */
  contentType: string;
  /** 업로드 용도. */
  purpose: UploadPurpose;
};

/** 날짜 범위 필터가 붙은 커서 목록 입력. 일별 생산 수량 조회에 쓴다. */
export type SellerDateCursorInput = {
  /** 이전 응답의 nextCursor. 첫 페이지는 생략한다. */
  cursor?: string | null | undefined;
  /** 조회 시작 날짜(이상). 미지정 시 하한 없음. */
  fromDate?: string | null | undefined;
  /** 한 번에 가져올 개수. 기본 20, 1~100만 허용하며 벗어나면 BAD_USER_INPUT. */
  limit?: number | null | undefined;
  /** 조회 종료 날짜(이하). 미지정 시 상한 없음. */
  toDate?: string | null | undefined;
};

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
 * 상품 카테고리 연결 설정 입력. 전달한 목록으로 통째로 교체한다
 * (빈 배열이면 연결을 모두 끊는다).
 */
export type SellerSetProductCategoriesInput = {
  /** 연결할 카테고리 ID 전체. */
  categoryIds: Array<string | number>;
  productId: string | number;
};

/** 이름 기반 태그 연결 설정 입력. 전달한 목록으로 통째로 교체한다. */
export type SellerSetProductTagsByNameInput = {
  /**
   * 연결할 태그 이름 전체. 정규화·중복 제거 뒤 최대 20개(개수는 정규화 문자열 기준 — 악센트만 다른 이름은 저장 시 하나로
   * 합쳐져도 각각 센다). 각 이름은 정규화 전후 모두 80자(코드 포인트) 이내. 빈 배열이면 전체 해제.
   */
  names: Array<string>;
  productId: string | number;
};

/** 태그 검색 입력. */
export type SellerTagSearchInput = {
  /** 검색어. 정규화 후 80자를 넘으면 BAD_USER_INPUT. */
  keyword: string;
  /** 최대 건수. 기본 10, 1~20만 허용하며 벗어나면 BAD_USER_INPUT. */
  limit?: number | null | undefined;
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

/**
 * 픽업 정책 수정 입력. 세 값이 함께 픽업 달력·시간 슬롯 생성 규칙을 이룬다.
 * 범위를 벗어나면 BAD_USER_INPUT.
 */
export type SellerUpdatePickupPolicyInput = {
  /** 예약 가능 범위(일). 오늘부터 이 일수까지 달력이 열린다. */
  maxDaysAhead: number;
  /** 최소 리드타임(분). 지금부터 이 시간 이후의 슬롯만 열린다. */
  minLeadTimeMinutes: number;
  /** 픽업 예약 시간 슬롯 간격(분). */
  pickupSlotIntervalMinutes: number;
};

/**
 * 매장 기본 정보 수정 입력. 모든 필드가 선택이며, 전달한 필드만 변경된다
 * (부분 수정). 전달하지 않은 필드는 기존 값을 유지한다.
 */
export type SellerUpdateStoreBasicInfoInput = {
  /** 시·도 단위. */
  addressCity?: string | null | undefined;
  /** 시·군·구 단위. */
  addressDistrict?: string | null | undefined;
  /** 전체 주소 문자열. */
  addressFull?: string | null | undefined;
  /** 읍·면·동 단위. */
  addressNeighborhood?: string | null | undefined;
  /** 영업시간 안내 문구(자유 입력). */
  businessHoursText?: string | null | undefined;
  /** 문의 채팅 인사말 템플릿. 빈 문자열이면 기본 문구로 되돌린다(null 저장). */
  greetingMessage?: string | null | undefined;
  /** 위도. 정밀도 손실을 피하려고 문자열로 받는다. */
  latitude?: string | null | undefined;
  /** 경도. 정밀도 손실을 피하려고 문자열로 받는다. */
  longitude?: string | null | undefined;
  /** 지도 진입에 쓸 provider. */
  mapProvider?: StoreMapProvider | null | undefined;
  /** 매장 프로필(로고) 이미지 URL. null 전달 시 제거. sellerCreateUploadUrl(STORE_IMAGE)로 이 계정에 발급된 publicUrl만 허용, 아니면 BAD_USER_INPUT. */
  profileImageUrl?: string | null | undefined;
  /** 매장명. */
  storeName?: string | null | undefined;
  /** 매장 대표 연락처. */
  storePhone?: string | null | undefined;
  /** 매장 홈페이지·SNS URL. */
  websiteUrl?: string | null | undefined;
};

/**
 * 요일별 영업시간 등록·수정 입력. dayOfWeek 기준으로 upsert되므로 같은 요일을 다시
 * 보내면 덮어쓴다.
 */
export type SellerUpsertStoreBusinessHourInput = {
  /** 영업 종료 시각. 시:분:초만 저장된다. */
  closeTime?: string | null | undefined;
  /** 요일. 0=일요일 ~ 6=토요일. */
  dayOfWeek: number;
  /** 정기 휴무 여부. true면 openTime·closeTime을 보내지 않아도 된다. */
  isClosed: boolean;
  /** 영업 시작 시각. 시:분:초만 저장된다. */
  openTime?: string | null | undefined;
};

/** 일별 생산 가능 수량 등록·수정 입력. */
export type SellerUpsertStoreDailyCapacityInput = {
  /** 그날 받을 수 있는 최대 주문 수량. */
  capacity: number;
  /** 대상 날짜. 날짜 부분만 저장된다. */
  capacityDate: string;
  /** 수정할 수량 설정 ID. 생략하면 새로 등록한다. */
  capacityId?: string | number | null | undefined;
};

/** 특별휴무 등록·수정 입력. */
export type SellerUpsertStoreSpecialClosureInput = {
  /** 휴무 날짜. 날짜 부분만 저장된다. */
  closureDate: string;
  /** 수정할 특별휴무 ID. 생략하면 새로 등록한다. */
  closureId?: string | number | null | undefined;
  /** 휴무 사유. */
  reason?: string | null | undefined;
};

/** 매장 지도 연동 provider. 구매자·판매자 API가 공용으로 쓴다. */
export type StoreMapProvider =
  /** 카카오맵 딥링크를 쓴다. */
  | 'KAKAO'
  /** 네이버 지도 딥링크를 쓴다. */
  | 'NAVER'
  /** 지도 연결 없음. 지도 진입 동선을 노출하지 않는다. */
  | 'NONE';

/**
 * 업로드 용도. 용도마다 저장 경로가 다르고, 저장 입력은 같은 용도로 발급된 URL만 받는다.
 * 역할별 허용 범위: 판매자 PRODUCT_IMAGE·STORE_IMAGE, 관리자 BANNER_IMAGE·STORE_IMAGE(밖이면 BAD_USER_INPUT).
 */
export type UploadPurpose =
  /** 플랫폼 배너 이미지(관리자). */
  | 'BANNER_IMAGE'
  /** 상품 이미지·커스텀 도안 바탕·옵션 선택지 이미지·커스텀 템플릿 바탕(판매자). */
  | 'PRODUCT_IMAGE'
  /** 매장 프로필(로고) 이미지(판매자·관리자). */
  | 'STORE_IMAGE';

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

export type SellerProductCreateMutationVariables = Exact<{
  input: SellerCreateProductInput;
}>;


export type SellerProductCreateMutation = { sellerCreateProduct: { id: string } };

export type SellerProductAddImageMutationVariables = Exact<{
  input: SellerAddProductImageInput;
}>;


export type SellerProductAddImageMutation = { sellerAddProductImage: { id: string } };

export type SellerProductSetCategoriesMutationVariables = Exact<{
  input: SellerSetProductCategoriesInput;
}>;


export type SellerProductSetCategoriesMutation = { sellerSetProductCategories: { id: string } };

export type SellerProductSetTagsMutationVariables = Exact<{
  input: SellerSetProductTagsByNameInput;
}>;


export type SellerProductSetTagsMutation = { sellerSetProductTagsByName: { id: string } };

export type SellerProductCreateOptionGroupMutationVariables = Exact<{
  input: SellerCreateOptionGroupInput;
}>;


export type SellerProductCreateOptionGroupMutation = { sellerCreateOptionGroup: { id: string } };

export type SellerProductCreateOptionItemMutationVariables = Exact<{
  input: SellerCreateOptionItemInput;
}>;


export type SellerProductCreateOptionItemMutation = { sellerCreateOptionItem: { id: string } };

export type SellerProductTagSearchQueryVariables = Exact<{
  input: SellerTagSearchInput;
}>;


export type SellerProductTagSearchQuery = { sellerSearchTags: Array<{ id: string, name: string, isExactMatch: boolean, productCount: number }> };

export type SellerStoreFieldsFragment = { id: string, storeName: string, storePhone: string, addressFull: string, addressCity: string | null, addressDistrict: string | null, addressNeighborhood: string | null, mapProvider: StoreMapProvider, websiteUrl: string | null, businessHoursText: string | null, profileImageUrl: string | null, greetingMessage: string | null, pickupSlotIntervalMinutes: number, minLeadTimeMinutes: number, maxDaysAhead: number, isActive: boolean };

export type SellerStoreMyStoreQueryVariables = Exact<{ [key: string]: never; }>;


export type SellerStoreMyStoreQuery = { sellerMyStore: { id: string, storeName: string, storePhone: string, addressFull: string, addressCity: string | null, addressDistrict: string | null, addressNeighborhood: string | null, mapProvider: StoreMapProvider, websiteUrl: string | null, businessHoursText: string | null, profileImageUrl: string | null, greetingMessage: string | null, pickupSlotIntervalMinutes: number, minLeadTimeMinutes: number, maxDaysAhead: number, isActive: boolean } };

export type SellerStoreRatingQueryVariables = Exact<{
  storeId: string | number;
}>;


export type SellerStoreRatingQuery = { storeDetail: { id: string, ratingAverage: number, reviewCount: number } };

export type SellerStoreUpdateBasicInfoMutationVariables = Exact<{
  input: SellerUpdateStoreBasicInfoInput;
}>;


export type SellerStoreUpdateBasicInfoMutation = { sellerUpdateStoreBasicInfo: { id: string, storeName: string, storePhone: string, addressFull: string, addressCity: string | null, addressDistrict: string | null, addressNeighborhood: string | null, mapProvider: StoreMapProvider, websiteUrl: string | null, businessHoursText: string | null, profileImageUrl: string | null, greetingMessage: string | null, pickupSlotIntervalMinutes: number, minLeadTimeMinutes: number, maxDaysAhead: number, isActive: boolean } };

export type SellerStoreUpdatePickupPolicyMutationVariables = Exact<{
  input: SellerUpdatePickupPolicyInput;
}>;


export type SellerStoreUpdatePickupPolicyMutation = { sellerUpdatePickupPolicy: { id: string, storeName: string, storePhone: string, addressFull: string, addressCity: string | null, addressDistrict: string | null, addressNeighborhood: string | null, mapProvider: StoreMapProvider, websiteUrl: string | null, businessHoursText: string | null, profileImageUrl: string | null, greetingMessage: string | null, pickupSlotIntervalMinutes: number, minLeadTimeMinutes: number, maxDaysAhead: number, isActive: boolean } };

export type SellerStoreCreateUploadUrlMutationVariables = Exact<{
  input: SellerCreateUploadUrlInput;
}>;


export type SellerStoreCreateUploadUrlMutation = { sellerCreateUploadUrl: { uploadUrl: string, publicUrl: string } };

export type SellerStoreFaqTopicsQueryVariables = Exact<{ [key: string]: never; }>;


export type SellerStoreFaqTopicsQuery = { sellerFaqTopics: Array<{ id: string, storeId: string, title: string, answerHtml: string, sortOrder: number, isActive: boolean, createdAt: string, updatedAt: string }> };

export type SellerStoreRegionGroupsQueryVariables = Exact<{ [key: string]: never; }>;


export type SellerStoreRegionGroupsQuery = { regionGroups: Array<{ id: string, name: string, hasChildren: boolean }> };

export type SellerStoreRegionsQueryVariables = Exact<{
  parentId: string | number;
}>;


export type SellerStoreRegionsQuery = { regions: Array<{ id: string, name: string }> };

export type SellerStoreSearchRegionsQueryVariables = Exact<{
  input: SearchRegionsInput;
}>;


export type SellerStoreSearchRegionsQuery = { searchRegions: Array<{ id: string, name: string, parentName: string | null, level: number }> };

export type SellerStoreBusinessHoursQueryVariables = Exact<{ [key: string]: never; }>;


export type SellerStoreBusinessHoursQuery = { sellerStoreBusinessHours: Array<{ id: string, dayOfWeek: number, isClosed: boolean, openTime: string | null, closeTime: string | null }> };

export type SellerStoreUpsertBusinessHourMutationVariables = Exact<{
  input: SellerUpsertStoreBusinessHourInput;
}>;


export type SellerStoreUpsertBusinessHourMutation = { sellerUpsertStoreBusinessHour: { id: string } };

export type SellerStoreSpecialClosuresQueryVariables = Exact<{
  input?: CursorInput | null | undefined;
}>;


export type SellerStoreSpecialClosuresQuery = { sellerStoreSpecialClosures: { totalCount: number, hasMore: boolean, nextCursor: string | null, items: Array<{ id: string, closureDate: string, reason: string | null }> } };

export type SellerStoreUpsertSpecialClosureMutationVariables = Exact<{
  input: SellerUpsertStoreSpecialClosureInput;
}>;


export type SellerStoreUpsertSpecialClosureMutation = { sellerUpsertStoreSpecialClosure: { id: string } };

export type SellerStoreDeleteSpecialClosureMutationVariables = Exact<{
  closureId: string | number;
}>;


export type SellerStoreDeleteSpecialClosureMutation = { sellerDeleteStoreSpecialClosure: boolean };

export type SellerStoreDailyCapacitiesQueryVariables = Exact<{
  input?: SellerDateCursorInput | null | undefined;
}>;


export type SellerStoreDailyCapacitiesQuery = { sellerStoreDailyCapacities: { totalCount: number, items: Array<{ id: string, capacityDate: string, capacity: number }> } };

export type SellerStoreUpsertDailyCapacityMutationVariables = Exact<{
  input: SellerUpsertStoreDailyCapacityInput;
}>;


export type SellerStoreUpsertDailyCapacityMutation = { sellerUpsertStoreDailyCapacity: { id: string } };

export type SellerStoreDeleteDailyCapacityMutationVariables = Exact<{
  capacityId: string | number;
}>;


export type SellerStoreDeleteDailyCapacityMutation = { sellerDeleteStoreDailyCapacity: boolean };

export type SellerStorePickupCalendarQueryVariables = Exact<{
  storeId: string | number;
  yearMonth: string;
}>;


export type SellerStorePickupCalendarQuery = { pickupCalendar: { yearMonth: string, days: Array<{ date: string, selectable: boolean, reason: string | null }> } };

export type SellerStorePickupTimeSlotsQueryVariables = Exact<{
  storeId: string | number;
  date: string;
}>;


export type SellerStorePickupTimeSlotsQuery = { pickupTimeSlots: { date: string, morning: Array<{ time: string, available: boolean }>, afternoon: Array<{ time: string, available: boolean }> } };

export type SellerUploadsCreateUploadUrlMutationVariables = Exact<{
  input: SellerCreateUploadUrlInput;
}>;


export type SellerUploadsCreateUploadUrlMutation = { sellerCreateUploadUrl: { uploadUrl: string, publicUrl: string } };

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
export const SellerStoreFieldsFragmentDoc = new TypedDocumentString(`
    fragment SellerStoreFields on SellerStore {
  id
  storeName
  storePhone
  addressFull
  addressCity
  addressDistrict
  addressNeighborhood
  mapProvider
  websiteUrl
  businessHoursText
  profileImageUrl
  greetingMessage
  pickupSlotIntervalMinutes
  minLeadTimeMinutes
  maxDaysAhead
  isActive
}
    `, {"fragmentName":"SellerStoreFields"}) as unknown as TypedDocumentString<SellerStoreFieldsFragment, unknown>;
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
export const SellerProductCreateDocument = new TypedDocumentString(`
    mutation SellerProductCreate($input: SellerCreateProductInput!) {
  sellerCreateProduct(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SellerProductCreateMutation, SellerProductCreateMutationVariables>;
export const SellerProductAddImageDocument = new TypedDocumentString(`
    mutation SellerProductAddImage($input: SellerAddProductImageInput!) {
  sellerAddProductImage(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SellerProductAddImageMutation, SellerProductAddImageMutationVariables>;
export const SellerProductSetCategoriesDocument = new TypedDocumentString(`
    mutation SellerProductSetCategories($input: SellerSetProductCategoriesInput!) {
  sellerSetProductCategories(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SellerProductSetCategoriesMutation, SellerProductSetCategoriesMutationVariables>;
export const SellerProductSetTagsDocument = new TypedDocumentString(`
    mutation SellerProductSetTags($input: SellerSetProductTagsByNameInput!) {
  sellerSetProductTagsByName(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SellerProductSetTagsMutation, SellerProductSetTagsMutationVariables>;
export const SellerProductCreateOptionGroupDocument = new TypedDocumentString(`
    mutation SellerProductCreateOptionGroup($input: SellerCreateOptionGroupInput!) {
  sellerCreateOptionGroup(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SellerProductCreateOptionGroupMutation, SellerProductCreateOptionGroupMutationVariables>;
export const SellerProductCreateOptionItemDocument = new TypedDocumentString(`
    mutation SellerProductCreateOptionItem($input: SellerCreateOptionItemInput!) {
  sellerCreateOptionItem(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SellerProductCreateOptionItemMutation, SellerProductCreateOptionItemMutationVariables>;
export const SellerProductTagSearchDocument = new TypedDocumentString(`
    query SellerProductTagSearch($input: SellerTagSearchInput!) {
  sellerSearchTags(input: $input) {
    id
    name
    isExactMatch
    productCount
  }
}
    `) as unknown as TypedDocumentString<SellerProductTagSearchQuery, SellerProductTagSearchQueryVariables>;
export const SellerStoreMyStoreDocument = new TypedDocumentString(`
    query SellerStoreMyStore {
  sellerMyStore {
    ...SellerStoreFields
  }
}
    fragment SellerStoreFields on SellerStore {
  id
  storeName
  storePhone
  addressFull
  addressCity
  addressDistrict
  addressNeighborhood
  mapProvider
  websiteUrl
  businessHoursText
  profileImageUrl
  greetingMessage
  pickupSlotIntervalMinutes
  minLeadTimeMinutes
  maxDaysAhead
  isActive
}`) as unknown as TypedDocumentString<SellerStoreMyStoreQuery, SellerStoreMyStoreQueryVariables>;
export const SellerStoreRatingDocument = new TypedDocumentString(`
    query SellerStoreRating($storeId: ID!) {
  storeDetail(storeId: $storeId) {
    id
    ratingAverage
    reviewCount
  }
}
    `) as unknown as TypedDocumentString<SellerStoreRatingQuery, SellerStoreRatingQueryVariables>;
export const SellerStoreUpdateBasicInfoDocument = new TypedDocumentString(`
    mutation SellerStoreUpdateBasicInfo($input: SellerUpdateStoreBasicInfoInput!) {
  sellerUpdateStoreBasicInfo(input: $input) {
    ...SellerStoreFields
  }
}
    fragment SellerStoreFields on SellerStore {
  id
  storeName
  storePhone
  addressFull
  addressCity
  addressDistrict
  addressNeighborhood
  mapProvider
  websiteUrl
  businessHoursText
  profileImageUrl
  greetingMessage
  pickupSlotIntervalMinutes
  minLeadTimeMinutes
  maxDaysAhead
  isActive
}`) as unknown as TypedDocumentString<SellerStoreUpdateBasicInfoMutation, SellerStoreUpdateBasicInfoMutationVariables>;
export const SellerStoreUpdatePickupPolicyDocument = new TypedDocumentString(`
    mutation SellerStoreUpdatePickupPolicy($input: SellerUpdatePickupPolicyInput!) {
  sellerUpdatePickupPolicy(input: $input) {
    ...SellerStoreFields
  }
}
    fragment SellerStoreFields on SellerStore {
  id
  storeName
  storePhone
  addressFull
  addressCity
  addressDistrict
  addressNeighborhood
  mapProvider
  websiteUrl
  businessHoursText
  profileImageUrl
  greetingMessage
  pickupSlotIntervalMinutes
  minLeadTimeMinutes
  maxDaysAhead
  isActive
}`) as unknown as TypedDocumentString<SellerStoreUpdatePickupPolicyMutation, SellerStoreUpdatePickupPolicyMutationVariables>;
export const SellerStoreCreateUploadUrlDocument = new TypedDocumentString(`
    mutation SellerStoreCreateUploadUrl($input: SellerCreateUploadUrlInput!) {
  sellerCreateUploadUrl(input: $input) {
    uploadUrl
    publicUrl
  }
}
    `) as unknown as TypedDocumentString<SellerStoreCreateUploadUrlMutation, SellerStoreCreateUploadUrlMutationVariables>;
export const SellerStoreFaqTopicsDocument = new TypedDocumentString(`
    query SellerStoreFaqTopics {
  sellerFaqTopics {
    id
    storeId
    title
    answerHtml
    sortOrder
    isActive
    createdAt
    updatedAt
  }
}
    `) as unknown as TypedDocumentString<SellerStoreFaqTopicsQuery, SellerStoreFaqTopicsQueryVariables>;
export const SellerStoreRegionGroupsDocument = new TypedDocumentString(`
    query SellerStoreRegionGroups {
  regionGroups {
    id
    name
    hasChildren
  }
}
    `) as unknown as TypedDocumentString<SellerStoreRegionGroupsQuery, SellerStoreRegionGroupsQueryVariables>;
export const SellerStoreRegionsDocument = new TypedDocumentString(`
    query SellerStoreRegions($parentId: ID!) {
  regions(parentId: $parentId) {
    id
    name
  }
}
    `) as unknown as TypedDocumentString<SellerStoreRegionsQuery, SellerStoreRegionsQueryVariables>;
export const SellerStoreSearchRegionsDocument = new TypedDocumentString(`
    query SellerStoreSearchRegions($input: SearchRegionsInput!) {
  searchRegions(input: $input) {
    id
    name
    parentName
    level
  }
}
    `) as unknown as TypedDocumentString<SellerStoreSearchRegionsQuery, SellerStoreSearchRegionsQueryVariables>;
export const SellerStoreBusinessHoursDocument = new TypedDocumentString(`
    query SellerStoreBusinessHours {
  sellerStoreBusinessHours {
    id
    dayOfWeek
    isClosed
    openTime
    closeTime
  }
}
    `) as unknown as TypedDocumentString<SellerStoreBusinessHoursQuery, SellerStoreBusinessHoursQueryVariables>;
export const SellerStoreUpsertBusinessHourDocument = new TypedDocumentString(`
    mutation SellerStoreUpsertBusinessHour($input: SellerUpsertStoreBusinessHourInput!) {
  sellerUpsertStoreBusinessHour(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SellerStoreUpsertBusinessHourMutation, SellerStoreUpsertBusinessHourMutationVariables>;
export const SellerStoreSpecialClosuresDocument = new TypedDocumentString(`
    query SellerStoreSpecialClosures($input: CursorInput) {
  sellerStoreSpecialClosures(input: $input) {
    items {
      id
      closureDate
      reason
    }
    totalCount
    hasMore
    nextCursor
  }
}
    `) as unknown as TypedDocumentString<SellerStoreSpecialClosuresQuery, SellerStoreSpecialClosuresQueryVariables>;
export const SellerStoreUpsertSpecialClosureDocument = new TypedDocumentString(`
    mutation SellerStoreUpsertSpecialClosure($input: SellerUpsertStoreSpecialClosureInput!) {
  sellerUpsertStoreSpecialClosure(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SellerStoreUpsertSpecialClosureMutation, SellerStoreUpsertSpecialClosureMutationVariables>;
export const SellerStoreDeleteSpecialClosureDocument = new TypedDocumentString(`
    mutation SellerStoreDeleteSpecialClosure($closureId: ID!) {
  sellerDeleteStoreSpecialClosure(closureId: $closureId)
}
    `) as unknown as TypedDocumentString<SellerStoreDeleteSpecialClosureMutation, SellerStoreDeleteSpecialClosureMutationVariables>;
export const SellerStoreDailyCapacitiesDocument = new TypedDocumentString(`
    query SellerStoreDailyCapacities($input: SellerDateCursorInput) {
  sellerStoreDailyCapacities(input: $input) {
    items {
      id
      capacityDate
      capacity
    }
    totalCount
  }
}
    `) as unknown as TypedDocumentString<SellerStoreDailyCapacitiesQuery, SellerStoreDailyCapacitiesQueryVariables>;
export const SellerStoreUpsertDailyCapacityDocument = new TypedDocumentString(`
    mutation SellerStoreUpsertDailyCapacity($input: SellerUpsertStoreDailyCapacityInput!) {
  sellerUpsertStoreDailyCapacity(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<SellerStoreUpsertDailyCapacityMutation, SellerStoreUpsertDailyCapacityMutationVariables>;
export const SellerStoreDeleteDailyCapacityDocument = new TypedDocumentString(`
    mutation SellerStoreDeleteDailyCapacity($capacityId: ID!) {
  sellerDeleteStoreDailyCapacity(capacityId: $capacityId)
}
    `) as unknown as TypedDocumentString<SellerStoreDeleteDailyCapacityMutation, SellerStoreDeleteDailyCapacityMutationVariables>;
export const SellerStorePickupCalendarDocument = new TypedDocumentString(`
    query SellerStorePickupCalendar($storeId: ID!, $yearMonth: String!) {
  pickupCalendar(storeId: $storeId, yearMonth: $yearMonth) {
    yearMonth
    days {
      date
      selectable
      reason
    }
  }
}
    `) as unknown as TypedDocumentString<SellerStorePickupCalendarQuery, SellerStorePickupCalendarQueryVariables>;
export const SellerStorePickupTimeSlotsDocument = new TypedDocumentString(`
    query SellerStorePickupTimeSlots($storeId: ID!, $date: String!) {
  pickupTimeSlots(storeId: $storeId, date: $date) {
    date
    morning {
      time
      available
    }
    afternoon {
      time
      available
    }
  }
}
    `) as unknown as TypedDocumentString<SellerStorePickupTimeSlotsQuery, SellerStorePickupTimeSlotsQueryVariables>;
export const SellerUploadsCreateUploadUrlDocument = new TypedDocumentString(`
    mutation SellerUploadsCreateUploadUrl($input: SellerCreateUploadUrlInput!) {
  sellerCreateUploadUrl(input: $input) {
    uploadUrl
    publicUrl
  }
}
    `) as unknown as TypedDocumentString<SellerUploadsCreateUploadUrlMutation, SellerUploadsCreateUploadUrlMutationVariables>;
export const PingDocument = new TypedDocumentString(`
    query Ping {
  ping
}
    `) as unknown as TypedDocumentString<PingQuery, PingQueryVariables>;