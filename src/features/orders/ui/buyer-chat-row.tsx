import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { messageFor } from '@/shared/api';
import { colors } from '@/shared/config/tokens';
import { Badge, Icon, showToast } from '@/shared/ui';

import { orderConversationQueryOptions } from '../api/orders';

const NO_CONVERSATION = '아직 대화가 없어요';

/** '구매자와 채팅' 행: 주문자 계정의 대화방으로 이동, 미읽음 수를 답변 필요로 */
export function BuyerChatRow({ accountId }: { accountId: string }) {
  const {
    data: conversation,
    error,
    isPending,
  } = useQuery(orderConversationQueryOptions(accountId));
  const unread = conversation?.unreadCount ?? 0;
  const description = isPending
    ? '대화를 찾는 중이에요'
    : !conversation
      ? NO_CONVERSATION
      : unread > 0
        ? `답변 필요 ${unread}건 · 답장하면 읽음 처리`
        : '주문자와 나눈 대화 보기';
  const open = () => {
    if (conversation) {
      router.push({
        pathname: '/chats/[conversationId]',
        params: { conversationId: conversation.id },
      });
    } else if (error) {
      showToast.error(messageFor(error));
    } else if (!isPending) {
      showToast.info(NO_CONVERSATION);
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`구매자와 채팅, ${description}`}
      onPress={open}
      className="min-h-14 flex-row items-center gap-3 px-4 py-2.5"
    >
      <View className="flex-1">
        <Text className="font-sans text-md font-medium tracking-tight text-text">
          구매자와 채팅
        </Text>
        <Text className="mt-0.5 font-sans text-xs tracking-tight text-muted">{description}</Text>
      </View>
      <Badge count={unread} />
      <Icon name="chevronRight" size={16} color={colors.chevron} strokeWidth={2.5} />
    </Pressable>
  );
}
