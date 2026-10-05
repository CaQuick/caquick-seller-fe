import { infiniteQueryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { type AuditTargetType } from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

import { storeKeys } from './queryKeys';

const SellerStoreAuditLogsDocument = graphql(`
  query SellerStoreAuditLogs($input: SellerAuditLogListInput) {
    sellerAuditLogs(input: $input) {
      items {
        id
        targetType
        targetId
        action
        beforeJson
        afterJson
        createdAt
      }
      totalCount
      hasMore
      nextCursor
    }
  }
`);

/** 최신순 커서 목록. targetType이 없으면 전체 */
export const auditLogsQueryOptions = (targetType: AuditTargetType | null) =>
  infiniteQueryOptions({
    queryKey: storeKeys.auditLogs(targetType ?? undefined),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      (
        await gqlRequest(SellerStoreAuditLogsDocument, {
          input: { limit: 20, cursor: pageParam, targetType },
        })
      ).sellerAuditLogs,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });
