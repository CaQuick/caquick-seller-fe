import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { gqlRequest } from '@/shared/api';

import { type ProductListFilter, productsKeys } from './queryKeys';

const SellerProductsListDocument = graphql(`
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
`);

const SellerProductDetailDocument = graphql(`
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
`);

const SellerProductsFilterCategoriesDocument = graphql(`
  query SellerProductsFilterCategories {
    categories {
      id
      name
      categoryType
      sortOrder
    }
  }
`);

const SellerProductBuyerPreviewDocument = graphql(`
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
`);

const SellerProductSetActiveDocument = graphql(`
  mutation SellerProductSetActive($input: SellerSetProductActiveInput!) {
    sellerSetProductActive(input: $input) {
      id
      isActive
    }
  }
`);

const SellerProductDeleteDocument = graphql(`
  mutation SellerProductDelete($productId: ID!) {
    sellerDeleteProduct(productId: $productId)
  }
`);

const PAGE_SIZE = 20;

/** 판매 중/숨김은 isActive를 늘 명시한다 — 생략하면 BE가 활성 상품만 준다 */
export const productListQueryOptions = (filter: ProductListFilter & { isActive: boolean }) =>
  infiniteQueryOptions({
    queryKey: productsKeys.list(filter),
    queryFn: async ({ pageParam }) =>
      (
        await gqlRequest(SellerProductsListDocument, {
          input: { ...filter, limit: PAGE_SIZE, cursor: pageParam },
        })
      ).sellerProducts,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });

export const productDetailQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: productsKeys.detail(productId),
    queryFn: async () =>
      (await gqlRequest(SellerProductDetailDocument, { productId })).sellerProduct,
  });

/** 전역 카테고리 전체. 이벤트·스타일 정렬은 model이 한다 */
export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: productsKeys.categories(),
    queryFn: async () => (await gqlRequest(SellerProductsFilterCategoriesDocument)).categories,
    staleTime: 10 * 60 * 1000,
  });

/** 구매자용 상세 + 후기 수. 숨김 상품은 BE가 NOT_FOUND로 막는다 */
export const buyerPreviewQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: productsKeys.buyerPreview(productId),
    queryFn: () =>
      gqlRequest(SellerProductBuyerPreviewDocument, {
        productId,
        reviews: { productId, limit: 1 },
      }),
  });

export async function setProductActive(productId: string, isActive: boolean) {
  return (await gqlRequest(SellerProductSetActiveDocument, { input: { productId, isActive } }))
    .sellerSetProductActive;
}

export async function deleteProduct(productId: string): Promise<void> {
  await gqlRequest(SellerProductDeleteDocument, { productId });
}
