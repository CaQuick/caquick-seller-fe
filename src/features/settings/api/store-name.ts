import { queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { gqlRequest } from '@/shared/api';

import { settingsKeys } from './queryKeys';

const SellerSettingsStoreDocument = graphql(`
  query SellerSettingsStore {
    sellerMyStore {
      id
      storeName
    }
  }
`);

export const settingsStoreQueryOptions = () =>
  queryOptions({
    queryKey: settingsKeys.store(),
    queryFn: async () => (await gqlRequest(SellerSettingsStoreDocument)).sellerMyStore,
  });
