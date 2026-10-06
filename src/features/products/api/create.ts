import { queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import {
  type SellerCreateOptionGroupInput,
  type SellerCreateOptionItemInput,
  type SellerCreateProductInput,
} from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

import { productsKeys } from './queryKeys';

const SellerProductCreateDocument = graphql(`
  mutation SellerProductCreate($input: SellerCreateProductInput!) {
    sellerCreateProduct(input: $input) {
      id
    }
  }
`);

const SellerProductAddImageDocument = graphql(`
  mutation SellerProductAddImage($input: SellerAddProductImageInput!) {
    sellerAddProductImage(input: $input) {
      id
    }
  }
`);

const SellerProductSetCategoriesDocument = graphql(`
  mutation SellerProductSetCategories($input: SellerSetProductCategoriesInput!) {
    sellerSetProductCategories(input: $input) {
      id
    }
  }
`);

const SellerProductSetTagsDocument = graphql(`
  mutation SellerProductSetTags($input: SellerSetProductTagsByNameInput!) {
    sellerSetProductTagsByName(input: $input) {
      id
    }
  }
`);

const SellerProductCreateOptionGroupDocument = graphql(`
  mutation SellerProductCreateOptionGroup($input: SellerCreateOptionGroupInput!) {
    sellerCreateOptionGroup(input: $input) {
      id
    }
  }
`);

const SellerProductCreateOptionItemDocument = graphql(`
  mutation SellerProductCreateOptionItem($input: SellerCreateOptionItemInput!) {
    sellerCreateOptionItem(input: $input) {
      id
    }
  }
`);

const SellerProductTagSearchDocument = graphql(`
  query SellerProductTagSearch($input: SellerTagSearchInput!) {
    sellerSearchTags(input: $input) {
      id
      name
      isExactMatch
      productCount
    }
  }
`);

export async function createProduct(input: SellerCreateProductInput): Promise<string> {
  return (await gqlRequest(SellerProductCreateDocument, { input })).sellerCreateProduct.id;
}

export async function addProductImage(productId: string, imageUrl: string): Promise<void> {
  await gqlRequest(SellerProductAddImageDocument, { input: { productId, imageUrl } });
}

export async function setProductCategories(productId: string, categoryIds: string[]) {
  await gqlRequest(SellerProductSetCategoriesDocument, { input: { productId, categoryIds } });
}

export async function setProductTags(productId: string, names: string[]): Promise<void> {
  await gqlRequest(SellerProductSetTagsDocument, { input: { productId, names } });
}

export async function createOptionGroup(input: SellerCreateOptionGroupInput): Promise<string> {
  return (await gqlRequest(SellerProductCreateOptionGroupDocument, { input }))
    .sellerCreateOptionGroup.id;
}

export async function createOptionItem(input: SellerCreateOptionItemInput): Promise<string> {
  return (await gqlRequest(SellerProductCreateOptionItemDocument, { input })).sellerCreateOptionItem
    .id;
}

/** 키워드는 호출자가 정규화해 넘긴다 — 같은 키워드는 같은 캐시를 쓴다 */
export const tagSearchQueryOptions = (keyword: string) =>
  queryOptions({
    queryKey: productsKeys.tagSearch(keyword),
    queryFn: async () =>
      (await gqlRequest(SellerProductTagSearchDocument, { input: { keyword, limit: 8 } }))
        .sellerSearchTags,
    staleTime: 60 * 1000,
  });
