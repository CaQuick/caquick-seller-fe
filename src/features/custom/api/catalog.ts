import { queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { gqlRequest } from '@/shared/api';

import { customKeys } from './queryKeys';

const SellerCustomCatalogDocument = graphql(`
  query SellerCustomCatalog {
    customThreeDCatalog {
      revision
      optionChoices {
        key
        category
        value
        label
        defaultPriceDelta
        renderScale
        selectable
      }
      sheetColors {
        key
        hex
      }
      decos {
        key
        label
        imageUrl
      }
      textColorPresets
    }
  }
`);

/** 항목은 퇴역만 하고 바뀌지 않아 오래 둔다 */
export const customCatalogQueryOptions = () =>
  queryOptions({
    queryKey: customKeys.catalog(),
    queryFn: async () => (await gqlRequest(SellerCustomCatalogDocument)).customThreeDCatalog,
    staleTime: 60 * 60 * 1000,
  });
