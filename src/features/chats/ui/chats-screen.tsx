import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { messageFor } from '@/shared/api';
import { colors } from '@/shared/config/tokens';
import { Chip, Empty, ErrorState, Screen, SkeletonRows, showToast } from '@/shared/ui';

import { type Conversation, conversationsQueryOptions } from '../api/conversations';
import { needsReply } from '../model/conversation-merge';
import { CHATS_COPY } from '../model/copy';
import { buyerName } from '../model/format';
import { useConversationSync } from '../model/use-conversation-sync';
import { ConversationRow } from './conversation-row';

type Filter = 'all' | 'needsReply';

/** 채팅 탭: 답변 필요 필터 + 대화 목록(커서 무한 스크롤) + 구독 머지 */
export function ChatsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const query = useInfiniteQuery(conversationsQueryOptions());
  const isFocused = useIsFocused();
  const focusedRef = useRef(isFocused);
  useEffect(() => {
    focusedRef.current = isFocused;
  }, [isFocused]);

  useConversationSync(
    useCallback((c: Conversation) => {
      if (focusedRef.current)
        showToast.info(
          CHATS_COPY.newInquiry(buyerName(c.buyerNickname), c.lastMessagePreview ?? ''),
        );
    }, []),
  );

  const all = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const needsReplyCount = all.filter(needsReply).length;
  const items = filter === 'all' ? all : all.filter(needsReply);
  const now = new Date();

  const body = () => {
    if (query.isPending) return <SkeletonRows count={5} />;
    if (query.isError)
      return (
        <ErrorState description={messageFor(query.error)} onRetry={() => void query.refetch()} />
      );
    return (
      <Empty
        icon="chats"
        title={filter === 'all' ? CHATS_COPY.emptyTitle : CHATS_COPY.emptyNeedsReplyTitle}
        description={
          filter === 'all' ? CHATS_COPY.emptyDescription : CHATS_COPY.emptyNeedsReplyDescription
        }
      />
    );
  };

  return (
    <Screen edges={[]}>
      <View className="mt-6 flex-row gap-2 px-5">
        <Chip
          variant="filter"
          label={CHATS_COPY.filterAll}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <Chip
          variant="filter"
          label={
            needsReplyCount > 0
              ? `${CHATS_COPY.filterNeedsReply} ${needsReplyCount}`
              : CHATS_COPY.filterNeedsReply
          }
          selected={filter === 'needsReply'}
          onPress={() => setFilter('needsReply')}
        />
      </View>
      <FlatList
        testID="chats-list"
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            now={now}
            onPress={() =>
              router.push({
                pathname: '/chats/[conversationId]',
                params: { conversationId: item.id },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        ListEmptyComponent={body}
        contentContainerClassName="px-5 pb-6 pt-[22px]"
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primaryStrong}
          />
        }
      />
    </Screen>
  );
}
