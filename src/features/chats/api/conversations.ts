import { type InfiniteData, infiniteQueryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { type SellerChatsConversationsQuery } from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

import { chatsKeys } from './queryKeys';

const SellerChatsConversationsDocument = graphql(`
  query SellerChatsConversations($input: CursorInput) {
    sellerConversations(input: $input) {
      items {
        id
        accountId
        buyerNickname
        lastMessagePreview
        lastMessageAt
        sellerLastReadAt
        unreadCount
        updatedAt
      }
      totalCount
      hasMore
      nextCursor
    }
  }
`);

export const SellerChatsConversationUpdatedDocument = graphql(`
  subscription SellerChatsConversationUpdated {
    sellerConversationUpdated {
      conversationId
      accountId
      buyerNickname
      lastMessagePreview
      lastMessageAt
      sellerLastReadAt
      unreadCount
    }
  }
`);

export type ConversationPage = SellerChatsConversationsQuery['sellerConversations'];
export type Conversation = ConversationPage['items'][number];
export type ConversationPages = InfiniteData<ConversationPage, string | null>;

const PAGE_SIZE = 50;

export const conversationsQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: chatsKeys.conversations(),
    queryFn: async ({ pageParam }) =>
      (
        await gqlRequest(SellerChatsConversationsDocument, {
          input: { limit: PAGE_SIZE, cursor: pageParam },
        })
      ).sellerConversations,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });
