import { type QueryKey } from '@tanstack/react-query';
import { type Href } from 'expo-router';

import { chatsKeys } from '@/features/chats';
import { homeKeys } from '@/features/home';
import { ordersKeys } from '@/features/orders';

/** BE data 모양(seller-push-messages.helper). 값은 전부 문자열 */
export type PushTarget =
  { kind: 'ORDER_SUBMITTED'; orderId: string } | { kind: 'BUYER_MESSAGE'; conversationId: string };

const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function parsePushData(data: unknown): PushTarget | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.kind === 'ORDER_SUBMITTED' && id(d.orderId)) return { kind: d.kind, orderId: d.orderId };
  if (d.kind === 'BUYER_MESSAGE' && id(d.conversationId))
    return { kind: d.kind, conversationId: d.conversationId };
  return null;
}

export function hrefFor(target: PushTarget): Href {
  return target.kind === 'ORDER_SUBMITTED'
    ? { pathname: '/orders/[id]', params: { id: target.orderId } }
    : { pathname: '/chats/[conversationId]', params: { conversationId: target.conversationId } };
}

export function staleKeysFor(target: PushTarget): QueryKey[] {
  return target.kind === 'ORDER_SUBMITTED'
    ? [ordersKeys.lists(), homeKeys.all]
    : [chatsKeys.conversations(), chatsKeys.messages(target.conversationId), homeKeys.all];
}

/** 포그라운드 문의 토스트를 띄울지. 채팅 탭(목록 구독이 알림)과 그 대화방에 있을 때를 뺀다 */
export function shouldToastMessage(conversationId: string, pathname: string): boolean {
  return pathname !== '/chats' && pathname !== `/chats/${conversationId}`;
}
