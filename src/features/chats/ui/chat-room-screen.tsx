import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';

import { ApiError, messageFor } from '@/shared/api';
import { colors } from '@/shared/config/tokens';
import { Empty, ErrorState, Screen, SkeletonRows, showToast } from '@/shared/ui';

import { type Conversation, type ConversationPages } from '../api/conversations';
import { type Message, buyerOrderQueryOptions } from '../api/messages';
import { chatsKeys } from '../api/queryKeys';
import { findConversation } from '../model/conversation-merge';
import { CHATS_COPY } from '../model/copy';
import { buyerName, formatDayLine, formatPickup, kstDayKey } from '../model/format';
import { type PendingMessage, useChatRoom } from '../model/use-chat-room';
import { useMarkRead } from '../model/use-mark-read';
import { ChatInputBar } from './chat-input-bar';
import { HtmlProvider } from './html-body';
import { MessageBubble, PendingBubble } from './message-bubble';
import { RoomHeader } from './room-header';
import { RoomMenuSheet } from './room-menu-sheet';

type Row =
  | { type: 'message'; message: Message; dayLine: string | null }
  | { type: 'pending'; pending: PendingMessage };

const subscribeOnline = (cb: () => void) => onlineManager.subscribe(cb);
const isOnline = () => onlineManager.isOnline();

/** 최신이 앞(inverted). 더 오래된 쪽 이웃과 날짜가 다르거나, 더 불러올 것이 없는 맨 끝이면 구분선을 단다 */
function toRows(messages: Message[], pending: PendingMessage[], hasMore: boolean): Row[] {
  const rows: Row[] = [...pending].reverse().map((p) => ({ type: 'pending', pending: p }));
  messages.forEach((message, i) => {
    const older = messages[i + 1];
    const day = kstDayKey(message.createdAt);
    const boundary = older ? kstDayKey(older.createdAt) !== day : !hasMore;
    rows.push({
      type: 'message',
      message,
      dayLine: boundary ? formatDayLine(message.createdAt) : null,
    });
  });
  return rows;
}

export function ChatRoomScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const queryClient = useQueryClient();
  const menu = useRef<BottomSheetModal>(null);
  const online = useSyncExternalStore(subscribeOnline, isOnline);
  const [conversation, setConversation] = useState<Conversation | undefined>(() =>
    findConversation(
      queryClient.getQueryData<ConversationPages>(chatsKeys.conversations()),
      conversationId,
    ),
  );
  const requestRead = useMarkRead(conversationId, setConversation);
  const room = useChatRoom(conversationId, requestRead);
  const nickname = conversation?.buyerNickname?.trim();
  const order = useQuery({ ...buyerOrderQueryOptions(nickname ?? ''), enabled: !!nickname });

  const notFound =
    room.query.error instanceof ApiError && room.query.error.classification === 'NOT_FOUND';
  useEffect(() => {
    if (!notFound) return;
    showToast.error(messageFor(room.query.error));
    router.back();
  }, [notFound, room.query.error]);

  const openOrder = () => {
    menu.current?.dismiss();
    if (order.data) router.push({ pathname: '/orders/[id]', params: { id: order.data.id } });
  };
  const orderSummary = order.data
    ? `${order.data.firstItemName ?? CHATS_COPY.menuOrder} · ${formatPickup(order.data.pickupAt)}`
    : null;

  const rows = toRows(room.messages, room.pending, room.query.hasNextPage);

  const body = () => {
    if (room.query.isPending) return <SkeletonRows count={4} />;
    if (room.query.isError)
      return (
        <ErrorState
          description={messageFor(room.query.error)}
          onRetry={() => void room.query.refetch()}
        />
      );
    return <Empty icon="chats" title={CHATS_COPY.roomEmpty} />;
  };

  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <RoomHeader
        title={buyerName(conversation?.buyerNickname)}
        hasOrder={!!order.data}
        onOrder={openOrder}
        onMenu={() => menu.current?.present()}
      />
      {online ? null : (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-3 bg-danger-bg px-5 py-2 text-center font-sans text-sm text-danger"
        >
          {CHATS_COPY.reconnecting}
        </Text>
      )}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <HtmlProvider>
          <FlatList
            inverted={rows.length > 0}
            data={rows}
            keyExtractor={(r) => (r.type === 'message' ? r.message.id : r.pending.localId)}
            renderItem={({ item }) =>
              item.type === 'pending' ? (
                <PendingBubble message={item.pending} onRetry={() => room.retry(item.pending)} />
              ) : (
                <View className="gap-2.5">
                  {item.dayLine ? (
                    <Text className="my-1 self-center rounded-sm bg-gray-bg px-2.5 py-[3px] font-sans text-xs text-muted">
                      {item.dayLine}
                    </Text>
                  ) : null}
                  <MessageBubble message={item.message} />
                </View>
              )
            }
            ItemSeparatorComponent={() => <View className="h-2.5" />}
            ListEmptyComponent={body}
            ListFooterComponent={
              room.query.isFetchingNextPage ? (
                <ActivityIndicator color={colors.primaryStrong} />
              ) : null
            }
            testID="chat-messages"
            contentContainerClassName="px-4 pb-5 pt-3"
            onEndReached={() => {
              if (room.query.hasNextPage && !room.query.isFetchingNextPage)
                void room.query.fetchNextPage();
            }}
            keyboardShouldPersistTaps="handled"
          />
        </HtmlProvider>
        <ChatInputBar sending={room.sending} onSend={room.send} />
      </KeyboardAvoidingView>
      <RoomMenuSheet
        ref={menu}
        onAutoReply={() => {
          menu.current?.dismiss();
          router.push('/store/faq');
        }}
        orderSummary={orderSummary}
        onOrder={openOrder}
      />
    </Screen>
  );
}
