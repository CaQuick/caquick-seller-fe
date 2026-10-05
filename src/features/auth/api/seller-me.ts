import { queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { gqlRequest } from '@/shared/api';

import { authKeys } from './queryKeys';

const SellerAuthMeDocument = graphql(`
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
`);

/** 부팅이 미리 채우고 설정·매장 화면이 같은 키로 읽는다 */
export const sellerMeQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.me(),
    queryFn: async () => (await gqlRequest(SellerAuthMeDocument)).sellerMe,
  });
