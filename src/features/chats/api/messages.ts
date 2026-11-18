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
        orderCard {
          orderId
          orderNumber
          productName
          thumbnailUrl
          pickupAt
        }
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
      orderCard {
        orderId
        orderNumber
        productName
        thumbnailUrl
        pickupAt
      }
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
      orderCard {
        orderId
        orderNumber
        productName
        thumbnailUrl
        pickupAt
      }
      createdAt
    }
  }
`);

const SellerChatsBuyerLatestOrderDocument = graphql(`
  query SellerChatsBuyerLatestOrder($buyerAccountId: ID!) {
    sellerOrderList(input: { buyerAccountId: $buyerAccountId, limit: 1 }) {
      items {
        id
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

/** 이 대화 상대(구매자 계정)의 최신 주문. 없으면 null */
export const buyerLatestOrderQueryOptions = (buyerAccountId: string) =>
  queryOptions({
    queryKey: chatsKeys.buyerOrder(buyerAccountId),
    queryFn: async () =>
      (await gqlRequest(SellerChatsBuyerLatestOrderDocument, { buyerAccountId })).sellerOrderList
        .items[0] ?? null,
  });
