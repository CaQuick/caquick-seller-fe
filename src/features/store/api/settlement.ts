import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { type SellerUpsertSettlementAccountInput } from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

import { storeKeys } from './queryKeys';

const PAGE_SIZE = 20;

const SellerStoreSettlementAccountDocument = graphql(`
  query SellerStoreSettlementAccount {
    sellerSettlementAccount {
      bank {
        code
        name
      }
      accountHolder
      accountNumberMasked
      updatedByRole
      updatedAt
    }
  }
`);

/** 등록 전이면 null. 계좌번호는 끝 4자리만 온다 */
export const settlementAccountQueryOptions = () =>
  queryOptions({
    queryKey: storeKeys.settlementAccount(),
    queryFn: async () =>
      (await gqlRequest(SellerStoreSettlementAccountDocument)).sellerSettlementAccount,
  });

const SellerStorePaymentBanksDocument = graphql(`
  query SellerStorePaymentBanks {
    paymentBanks {
      code
      name
    }
  }
`);

/** 배열 순서가 표시 순서. 바뀔 일이 드물어 한 시간 둔다 */
export const paymentBanksQueryOptions = () =>
  queryOptions({
    queryKey: storeKeys.paymentBanks(),
    queryFn: async () => (await gqlRequest(SellerStorePaymentBanksDocument)).paymentBanks,
    staleTime: 60 * 60_000,
  });

const SellerStoreUpsertSettlementAccountDocument = graphql(`
  mutation SellerStoreUpsertSettlementAccount($input: SellerUpsertSettlementAccountInput!) {
    sellerUpsertSettlementAccount(input: $input) {
      bank {
        code
        name
      }
      accountHolder
      accountNumberMasked
      updatedByRole
      updatedAt
    }
  }
`);

export const upsertSettlementAccount = async (input: SellerUpsertSettlementAccountInput) =>
  (await gqlRequest(SellerStoreUpsertSettlementAccountDocument, { input }))
    .sellerUpsertSettlementAccount;

const SellerStoreSettlementsDocument = graphql(`
  query SellerStoreSettlements($input: SellerSettlementListInput) {
    sellerSettlements(input: $input) {
      items {
        id
        periodStart
        periodEnd
        orderCount
        commissionAmount
        payoutAmount
        status
        paidAt
      }
      totalCount
      hasMore
      nextCursor
    }
  }
`);

export const settlementsQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: storeKeys.settlements(),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      (
        await gqlRequest(SellerStoreSettlementsDocument, {
          input: { limit: PAGE_SIZE, cursor: pageParam },
        })
      ).sellerSettlements,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });

const SellerStoreSettlementDocument = graphql(`
  query SellerStoreSettlement($settlementId: ID!) {
    sellerSettlement(settlementId: $settlementId) {
      id
      periodStart
      periodEnd
      orderCount
      settlementBaseAmount
      commissionAmount
      payoutAmount
      status
      paidAt
      paidAccount {
        bank {
          name
        }
        accountHolder
        accountNumberMasked
      }
      orders {
        orderId
        orderNumber
        productName
        status
        commissionRateBps
        settlementBaseAmount
        commissionAmount
        payoutAmount
        settlementFinalizedAt
      }
    }
  }
`);

export const settlementDetailQueryOptions = (settlementId: string) =>
  queryOptions({
    queryKey: storeKeys.settlement(settlementId),
    queryFn: async () =>
      (await gqlRequest(SellerStoreSettlementDocument, { settlementId })).sellerSettlement,
  });
