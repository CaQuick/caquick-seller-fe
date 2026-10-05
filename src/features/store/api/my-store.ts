import { type QueryClient, queryOptions } from '@tanstack/react-query';

import { homeKeys } from '@/features/home';
import { graphql } from '@/graphql/generated';
import {
  type SellerUpdatePickupPolicyInput,
  type SellerUpdateStoreBasicInfoInput,
} from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';
import { type Presign } from '@/shared/lib/upload';

import { storeKeys } from './queryKeys';

// 내 매장을 돌려주는 조회·수정이 같은 모양을 받아 캐시를 그대로 덮어쓴다
graphql(`
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
`);

const SellerStoreMyStoreDocument = graphql(`
  query SellerStoreMyStore {
    sellerMyStore {
      ...SellerStoreFields
    }
  }
`);

export const myStoreQueryOptions = () =>
  queryOptions({
    queryKey: storeKeys.myStore(),
    queryFn: async () => (await gqlRequest(SellerStoreMyStoreDocument)).sellerMyStore,
  });

const SellerStoreRatingDocument = graphql(`
  query SellerStoreRating($storeId: ID!) {
    storeDetail(storeId: $storeId) {
      id
      ratingAverage
      reviewCount
    }
  }
`);

/** 구매자용 매장 상세 — 비공개 매장은 NOT_FOUND라 호출자가 isActive일 때만 켠다 */
export const storeRatingQueryOptions = (storeId: string) =>
  queryOptions({
    queryKey: storeKeys.rating(storeId),
    queryFn: async () => (await gqlRequest(SellerStoreRatingDocument, { storeId })).storeDetail,
  });

const SellerStoreUpdateBasicInfoDocument = graphql(`
  mutation SellerStoreUpdateBasicInfo($input: SellerUpdateStoreBasicInfoInput!) {
    sellerUpdateStoreBasicInfo(input: $input) {
      ...SellerStoreFields
    }
  }
`);

export const updateBasicInfo = async (input: SellerUpdateStoreBasicInfoInput) =>
  (await gqlRequest(SellerStoreUpdateBasicInfoDocument, { input })).sellerUpdateStoreBasicInfo;

const SellerStoreUpdatePickupPolicyDocument = graphql(`
  mutation SellerStoreUpdatePickupPolicy($input: SellerUpdatePickupPolicyInput!) {
    sellerUpdatePickupPolicy(input: $input) {
      ...SellerStoreFields
    }
  }
`);

export const updatePickupPolicy = async (input: SellerUpdatePickupPolicyInput) =>
  (await gqlRequest(SellerStoreUpdatePickupPolicyDocument, { input })).sellerUpdatePickupPolicy;

/** 저장 응답으로 내 매장 캐시를 덮고, 같은 매장을 그리는 매장 허브·홈(매장명·운영 상태)을 다시 부른다 */
export async function syncSavedStore(
  queryClient: QueryClient,
  store: Awaited<ReturnType<typeof updateBasicInfo>>,
) {
  queryClient.setQueryData(storeKeys.myStore(), store);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: storeKeys.all }),
    queryClient.invalidateQueries({ queryKey: homeKeys.store() }),
  ]);
}

const SellerStoreCreateUploadUrlDocument = graphql(`
  mutation SellerStoreCreateUploadUrl($input: SellerCreateUploadUrlInput!) {
    sellerCreateUploadUrl(input: $input) {
      uploadUrl
      publicUrl
    }
  }
`);

export const presignStoreImage: Presign = async (input) =>
  (await gqlRequest(SellerStoreCreateUploadUrlDocument, { input })).sellerCreateUploadUrl;

const SellerStoreFaqTopicsDocument = graphql(`
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
`);

/** FAQ 화면과 같은 키 — 필드를 전부 받아 어느 쪽이 먼저 채워도 모양이 맞는다 */
export const faqTopicsQueryOptions = () =>
  queryOptions({
    queryKey: storeKeys.faqTopics(),
    queryFn: async () => (await gqlRequest(SellerStoreFaqTopicsDocument)).sellerFaqTopics,
  });
