import { queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import {
  type SellerUpdateOptionGroupInput,
  type SellerUpdateOptionItemInput,
  type SellerUpdateProductInput,
  type SellerUpsertProductCustomTextTokenInput,
} from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

import { productsKeys } from './queryKeys';

const SellerProductManageDocument = graphql(`
  query SellerProductManage($productId: ID!) {
    sellerProduct(productId: $productId) {
      id
      optionGroups {
        id
        name
        description
        isRequired
        minSelect
        maxSelect
        optionItems {
          id
          title
          description
          imageUrl
          priceDelta
          isActive
        }
      }
      customTemplate {
        id
        baseImageUrl
        isActive
        textTokens {
          id
          tokenKey
          defaultText
          maxLength
          isRequired
          posX
          posY
          width
          height
        }
      }
    }
  }
`);

const SellerProductUpdateDocument = graphql(`
  mutation SellerProductUpdate($input: SellerUpdateProductInput!) {
    sellerUpdateProduct(input: $input) {
      id
    }
  }
`);

const SellerProductDeleteImageDocument = graphql(`
  mutation SellerProductDeleteImage($imageId: ID!) {
    sellerDeleteProductImage(imageId: $imageId)
  }
`);

const SellerProductReorderImagesDocument = graphql(`
  mutation SellerProductReorderImages($input: SellerReorderProductImagesInput!) {
    sellerReorderProductImages(input: $input) {
      id
    }
  }
`);

const SellerProductUpdateOptionGroupDocument = graphql(`
  mutation SellerProductUpdateOptionGroup($input: SellerUpdateOptionGroupInput!) {
    sellerUpdateOptionGroup(input: $input) {
      id
    }
  }
`);

const SellerProductDeleteOptionGroupDocument = graphql(`
  mutation SellerProductDeleteOptionGroup($optionGroupId: ID!) {
    sellerDeleteOptionGroup(optionGroupId: $optionGroupId)
  }
`);

const SellerProductReorderOptionGroupsDocument = graphql(`
  mutation SellerProductReorderOptionGroups($input: SellerReorderOptionGroupsInput!) {
    sellerReorderOptionGroups(input: $input) {
      id
    }
  }
`);

const SellerProductUpdateOptionItemDocument = graphql(`
  mutation SellerProductUpdateOptionItem($input: SellerUpdateOptionItemInput!) {
    sellerUpdateOptionItem(input: $input) {
      id
    }
  }
`);

const SellerProductDeleteOptionItemDocument = graphql(`
  mutation SellerProductDeleteOptionItem($optionItemId: ID!) {
    sellerDeleteOptionItem(optionItemId: $optionItemId)
  }
`);

const SellerProductReorderOptionItemsDocument = graphql(`
  mutation SellerProductReorderOptionItems($input: SellerReorderOptionItemsInput!) {
    sellerReorderOptionItems(input: $input) {
      id
    }
  }
`);

const SellerProductUpsertTemplateDocument = graphql(`
  mutation SellerProductUpsertTemplate($input: SellerUpsertProductCustomTemplateInput!) {
    sellerUpsertProductCustomTemplate(input: $input) {
      id
    }
  }
`);

const SellerProductSetTemplateActiveDocument = graphql(`
  mutation SellerProductSetTemplateActive($input: SellerSetProductCustomTemplateActiveInput!) {
    sellerSetProductCustomTemplateActive(input: $input) {
      id
    }
  }
`);

const SellerProductUpsertTextTokenDocument = graphql(`
  mutation SellerProductUpsertTextToken($input: SellerUpsertProductCustomTextTokenInput!) {
    sellerUpsertProductCustomTextToken(input: $input) {
      id
    }
  }
`);

const SellerProductDeleteTextTokenDocument = graphql(`
  mutation SellerProductDeleteTextToken($tokenId: ID!) {
    sellerDeleteProductCustomTextToken(tokenId: $tokenId)
  }
`);

const SellerProductReorderTextTokensDocument = graphql(`
  mutation SellerProductReorderTextTokens($input: SellerReorderProductCustomTextTokensInput!) {
    sellerReorderProductCustomTextTokens(input: $input) {
      id
    }
  }
`);

/** 옵션·커스텀 문구 편집용 전체 필드. 상세 키 아래라 상세 invalidate에 같이 갱신된다 */
export const productManageQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: productsKeys.manage(productId),
    queryFn: async () =>
      (await gqlRequest(SellerProductManageDocument, { productId })).sellerProduct,
  });

export async function updateProduct(input: SellerUpdateProductInput): Promise<void> {
  await gqlRequest(SellerProductUpdateDocument, { input });
}

export async function deleteProductImage(imageId: string): Promise<void> {
  await gqlRequest(SellerProductDeleteImageDocument, { imageId });
}

export async function reorderProductImages(productId: string, imageIds: string[]): Promise<void> {
  await gqlRequest(SellerProductReorderImagesDocument, { input: { productId, imageIds } });
}

export async function updateOptionGroup(input: SellerUpdateOptionGroupInput): Promise<void> {
  await gqlRequest(SellerProductUpdateOptionGroupDocument, { input });
}

export async function deleteOptionGroup(optionGroupId: string): Promise<void> {
  await gqlRequest(SellerProductDeleteOptionGroupDocument, { optionGroupId });
}

export async function reorderOptionGroups(productId: string, optionGroupIds: string[]) {
  await gqlRequest(SellerProductReorderOptionGroupsDocument, {
    input: { productId, optionGroupIds },
  });
}

export async function updateOptionItem(input: SellerUpdateOptionItemInput): Promise<void> {
  await gqlRequest(SellerProductUpdateOptionItemDocument, { input });
}

export async function deleteOptionItem(optionItemId: string): Promise<void> {
  await gqlRequest(SellerProductDeleteOptionItemDocument, { optionItemId });
}

export async function reorderOptionItems(optionGroupId: string, optionItemIds: string[]) {
  await gqlRequest(SellerProductReorderOptionItemsDocument, {
    input: { optionGroupId, optionItemIds },
  });
}

export async function upsertCustomTemplate(
  productId: string,
  baseImageUrl: string,
  isActive: boolean,
): Promise<string> {
  return (
    await gqlRequest(SellerProductUpsertTemplateDocument, {
      input: { productId, baseImageUrl, isActive },
    })
  ).sellerUpsertProductCustomTemplate.id;
}

export async function setCustomTemplateActive(templateId: string, isActive: boolean) {
  await gqlRequest(SellerProductSetTemplateActiveDocument, { input: { templateId, isActive } });
}

export async function upsertTextToken(
  input: SellerUpsertProductCustomTextTokenInput,
): Promise<string> {
  return (await gqlRequest(SellerProductUpsertTextTokenDocument, { input }))
    .sellerUpsertProductCustomTextToken.id;
}

export async function deleteTextToken(tokenId: string): Promise<void> {
  await gqlRequest(SellerProductDeleteTextTokenDocument, { tokenId });
}

export async function reorderTextTokens(templateId: string, tokenIds: string[]): Promise<void> {
  await gqlRequest(SellerProductReorderTextTokensDocument, { input: { templateId, tokenIds } });
}
