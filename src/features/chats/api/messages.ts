import { type InfiniteData, infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { type SellerChatsMessagesQuery } from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

import { chatsKeys } from './queryKeys';

const SellerChatsMessagesDocument = graphql(`
  query SellerChatsMessages($conversationId: ID!, $input: CursorInput) {
    sellerConversationMessages(conversationId: $conversationId, input: $input) {
      items {
        id
        conversationId
        senderType
        senderAccountId
        bodyFormat
        bodyText
        bodyHtml
        createdAt
      }
      totalCount
      hasMore
      nextCursor
    }
  }
`);

const SellerChatsSendMessageDocument = graphql(`
  mutation SellerChatsSendMessage($input: SellerSendConversationMessageInput!) {
    sellerSendConversationMessage(input: $input) {
      id
      conversationId
      senderType
      senderAccountId
      bodyFormat
      bodyText
      bodyHtml
      createdAt
    }
  }
`);

const SellerChatsMarkReadDocument = graphql(`
  mutation SellerChatsMarkRead($conversationId: ID!) {
    sellerMarkConversationRead(conversationId: $conversationId) {
      id
      accountId
      buyerNickname
      lastMessagePreview
      lastMessageAt
      sellerLastReadAt
      unreadCount
      updatedAt
    }
  }
`);

export const SellerChatsMessageAddedDocument = graphql(`
  subscription SellerChatsMessageAdded($conversationId: ID!) {
    conversationMessageAdded(conversationId: $conversationId) {
      id
      conversationId
      senderType
      bodyFormat
      bodyText
      bodyHtml
      createdAt
    }
  }
`);

const SellerChatsBuyerOrderDocument = graphql(`
  query SellerChatsBuyerOrder($input: SellerOrderListInput) {
    sellerOrderList(input: $input) {
      items {
        id
        buyerName
        pickupAt
        firstItemName
      }
    }
  }
`);

type ServerMessage = SellerChatsMessagesQuery['sellerConversationMessages']['items'][number];
/** 구독으로 온 메시지는 senderAccountId를 모른다(undefined) */
export type Message = Omit<ServerMessage, 'senderAccountId'> & {
  senderAccountId?: string | null;
};
export interface MessagePage {
  items: Message[];
  hasMore: boolean;
  nextCursor?: string | null;
}
export type MessagePages = InfiniteData<MessagePage, string | null>;

const PAGE_SIZE = 30;

export const messagesQueryOptions = (conversationId: string) =>
  infiniteQueryOptions({
    queryKey: chatsKeys.messages(conversationId),
    queryFn: async ({ pageParam }): Promise<MessagePage> =>
      (
        await gqlRequest(SellerChatsMessagesDocument, {
          conversationId,
          input: { limit: PAGE_SIZE, cursor: pageParam },
        })
      ).sellerConversationMessages,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });

export async function sendTextMessage(conversationId: string, bodyText: string) {
  return (
    await gqlRequest(SellerChatsSendMessageDocument, {
      input: { conversationId, bodyFormat: 'TEXT', bodyText },
    })
  ).sellerSendConversationMessage;
}

export async function markConversationRead(conversationId: string) {
  return (await gqlRequest(SellerChatsMarkReadDocument, { conversationId }))
    .sellerMarkConversationRead;
}

/** 주문에 구매자 계정 필터가 없어 주문자 이름으로 찾고, 부분일치 결과 중 이름이 같은 첫 주문(최신순)을 고른다 */
export const buyerOrderQueryOptions = (buyerName: string) =>
  queryOptions({
    queryKey: chatsKeys.buyerOrder(buyerName),
    queryFn: async () => {
      const { items } = (
        await gqlRequest(SellerChatsBuyerOrderDocument, {
          input: { search: buyerName, limit: 20 },
        })
      ).sellerOrderList;
      return items.find((o) => o.buyerName === buyerName) ?? null;
    },
  });
