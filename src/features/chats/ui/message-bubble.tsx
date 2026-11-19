import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { formatTimeKst } from '@/shared/lib/kst';
import { cn } from '@/shared/lib/cn';
import { Icon, RemoteImage } from '@/shared/ui';

import { type Message } from '../api/messages';
import { CHATS_COPY } from '../model/copy';
import { formatPickup } from '../model/format';
import { type BubbleKind, bubbleKind, messageBody } from '../model/message-list';
import { type PendingMessage } from '../model/use-chat-room';
import { HtmlBody } from './html-body';

const BUBBLE: Record<Exclude<BubbleKind, 'system'>, string> = {
  user: 'rounded-bl-xs border border-line bg-surface',
  store: 'rounded-br-xs bg-primary',
  auto: 'rounded-bl-xs bg-tint',
};
const TEXT: Record<Exclude<BubbleKind, 'system'>, string> = {
  user: 'text-text',
  store: 'text-surface',
  auto: 'text-text3',
};

function Bubble({
  kind,
  children,
  aside,
}: {
  kind: Exclude<BubbleKind, 'system'>;
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <View
      className={cn(
        'max-w-[85%] items-end gap-1.5',
        kind === 'store' ? 'flex-row-reverse self-end' : 'flex-row self-start',
      )}
    >
      <View className={cn('shrink rounded-xl px-3.5 py-2.5', BUBBLE[kind])}>
        {kind === 'auto' ? (
          <Text className="mb-1 font-sans text-2xs font-semibold text-purple-text">
            {CHATS_COPY.autoReply}
          </Text>
        ) : null}
        {children}
      </View>
      {aside}
    </View>
  );
}

const Time = ({ iso }: { iso: string }) => (
  <Text className="font-sans text-2xs text-muted">{formatTimeKst(iso)}</Text>
);

type OrderCard = NonNullable<Message['orderCard']>;

/** 구매자가 보낸 주문 문의 카드. 누르면 그 주문 상세로 간다 */
function OrderCardBody({ card }: { card: OrderCard }) {
  const pickup = formatPickup(card.pickupAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${CHATS_COPY.orderCard}: ${card.productName}, ${card.orderNumber}, ${pickup}`}
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: card.orderId } })}
      className="w-56 gap-2"
    >
      <Text className="font-sans text-2xs font-semibold text-purple-text">
        {CHATS_COPY.orderCard}
      </Text>
      <View className="flex-row items-center gap-2.5">
        {card.thumbnailUrl ? (
          <RemoteImage
            uri={card.thumbnailUrl}
            style={{ width: 48, height: 48 }}
            className="rounded-md bg-gray-bg"
          />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-md bg-gray-bg">
            <Icon name="orders" size={20} color={colors.placeholder} />
          </View>
        )}
        <View className="flex-1">
          <Text
            numberOfLines={2}
            className="font-sans text-md font-semibold tracking-tight text-text"
          >
            {card.productName}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 font-sans text-xs text-muted">
            {card.orderNumber}
          </Text>
          <Text className="font-sans text-xs text-muted">{pickup}</Text>
        </View>
      </View>
      <Text className="font-sans text-xs font-medium text-primary-strong">
        {CHATS_COPY.orderLink}
      </Text>
    </Pressable>
  );
}

/** 말풍선: 구매자 좌 흰 배경 · 판매자 우 primary · 자동응답 좌 연보라 + 라벨 · 시스템 가운데 · 주문 카드 */
export function MessageBubble({ message }: { message: Message }) {
  const kind = bubbleKind(message);
  const body = messageBody(message);
  if (kind !== 'system' && message.bodyFormat === 'ORDER_CARD' && message.orderCard)
    return (
      <Bubble kind={kind} aside={<Time iso={message.createdAt} />}>
        <OrderCardBody card={message.orderCard} />
      </Bubble>
    );
  if (kind === 'system')
    return (
      <Text className="self-center rounded-sm bg-gray-bg px-2.5 py-[3px] font-sans text-xs text-muted">
        {body}
      </Text>
    );
  return (
    <Bubble kind={kind} aside={<Time iso={message.createdAt} />}>
      {message.bodyFormat === 'HTML' ? (
        <HtmlBody html={body} />
      ) : (
        <Text className={cn('font-sans text-md leading-[21px] tracking-tight', TEXT[kind])}>
          {body}
        </Text>
      )}
    </Bubble>
  );
}

/** 전송 중(흐리게)·실패(재시도) 버블 */
export function PendingBubble({
  message,
  onRetry,
}: {
  message: PendingMessage;
  onRetry: () => void;
}) {
  const failed = message.status === 'failed';
  return (
    <Bubble
      kind="store"
      aside={
        failed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${CHATS_COPY.retry}: ${message.text}`}
            onPress={onRetry}
            hitSlop={12}
            className="items-center gap-0.5"
          >
            <Icon name="retry" size={16} color={colors.danger} />
            <Text className="font-sans text-3xs text-danger">{CHATS_COPY.retry}</Text>
          </Pressable>
        ) : null
      }
    >
      <Text
        className={cn(
          'font-sans text-md leading-[21px] tracking-tight text-surface',
          !failed && 'opacity-60',
        )}
      >
        {message.text}
      </Text>
    </Bubble>
  );
}
