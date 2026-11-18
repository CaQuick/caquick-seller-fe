import { type QueryKey } from '@tanstack/react-query';
import { type Href } from 'expo-router';

import { chatsKeys } from '@/features/chats';
import { homeKeys } from '@/features/home';
import { type OrderNoticeKind, ordersKeys } from '@/features/orders';

/** BE data 모양(seller-push-messages.helper). 값은 전부 문자열 */
export type PushTarget =
  { kind: OrderNoticeKind; orderId: string } | { kind: 'BUYER_MESSAGE'; conversationId: string };

const ORDER_KINDS: readonly string[] = [
  'ORDER_SUBMITTED',
  'ORDER_CANCELED',
  'ORDER_CONFIRM_REMINDER',
] satisfies OrderNoticeKind[];

const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function parsePushData(data: unknown): PushTarget | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.kind === 'string' && ORDER_KINDS.includes(d.kind) && id(d.orderId))
    return { kind: d.kind as OrderNoticeKind, orderId: d.orderId };
  if (d.kind === 'BUYER_MESSAGE' && id(d.conversationId))
    return { kind: d.kind, conversationId: d.conversationId };
  return null;
}

export function hrefFor(target: PushTarget): Href {
  return target.kind === 'BUYER_MESSAGE'
    ? { pathname: '/chats/[conversationId]', params: { conversationId: target.conversationId } }
    : { pathname: '/orders/[id]', params: { id: target.orderId } };
}

export function staleKeysFor(target: PushTarget): QueryKey[] {
  return target.kind === 'BUYER_MESSAGE'
    ? [chatsKeys.conversations(), chatsKeys.messages(target.conversationId), homeKeys.all]
    : [ordersKeys.lists(), ordersKeys.detail(target.orderId), homeKeys.all];
}

/** 포그라운드 문의 토스트를 띄울지. 채팅 탭(목록 구독이 알림)과 그 대화방에 있을 때를 뺀다 */
export function shouldToastMessage(conversationId: string, pathname: string): boolean {
  return pathname !== '/chats' && pathname !== `/chats/${conversationId}`;
}
