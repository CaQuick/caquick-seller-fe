import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { gqlRequest } from '@/shared/api';

import { storeKeys } from './queryKeys';

const SellerStorePreviewDetailDocument = graphql(`
  query SellerStorePreviewDetail($storeId: ID!) {
    storeDetail(storeId: $storeId) {
      id
      storeName
      regionLabel
      ratingAverage
      reviewCount
      images
    }
    storeProductCategories(storeId: $storeId) {
      id
      name
      sortOrder
      productCount
    }
  }
`);

/** 구매자용 매장 상세 + 카테고리. 비공개 매장은 NOT_FOUND */
export const previewQueryOptions = (storeId: string) =>
  queryOptions({
    queryKey: storeKeys.preview(storeId),
    queryFn: () => gqlRequest(SellerStorePreviewDetailDocument, { storeId }),
  });

const SellerStorePreviewProductsDocument = graphql(`
  query SellerStorePreviewProducts($input: StoreProductsInput!) {
    storeProducts(input: $input) {
      items {
        product {
          id
          name
          thumbnailUrl
          regularPrice
          salePrice
          discountRate
        }
      }
      totalCount
      hasMore
      nextCursor
    }
  }
`);

/** 구매자에게 보이는 활성 상품만 온다. categoryId가 null이면 전체 */
export const previewProductsQueryOptions = (storeId: string, categoryId: string | null) =>
  infiniteQueryOptions({
    queryKey: storeKeys.previewProducts(storeId, categoryId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      (
        await gqlRequest(SellerStorePreviewProductsDocument, {
          input: { storeId, categoryId, cursor: pageParam, limit: 20 },
        })
      ).storeProducts,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });

const SellerStorePreviewProductDocument = graphql(`
  query SellerStorePreviewProduct($productId: ID!) {
    productDetail(productId: $productId) {
      id
      name
      description
      purchaseNotice
      images
      regularPrice
      salePrice
      discountRate
    }
  }
`);

export const previewProductQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: storeKeys.previewProduct(productId),
    queryFn: async () =>
      (await gqlRequest(SellerStorePreviewProductDocument, { productId })).productDetail,
  });
