import { Pressable, Text, View } from 'react-native';

import { shadow } from '@/shared/config/tokens';
import { Badge } from '@/shared/ui';

import { type Conversation } from '../api/conversations';
import { avatarInitial, buyerName, formatListTime } from '../model/format';

interface Props {
  conversation: Conversation;
  now: Date;
  onPress: () => void;
}

/** 대화 행(.orow): 아바타 원 44 · 닉네임 16/600 · 미리보기 1줄 · 상대 시각 · 미읽음 배지 */
export function ConversationRow({ conversation: c, now, onPress }: Props) {
  const name = buyerName(c.buyerNickname);
  const time = c.lastMessageAt ? formatListTime(c.lastMessageAt, now) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        name,
        c.lastMessagePreview,
        time,
        c.unreadCount > 0 ? `안 읽은 메시지 ${c.unreadCount}건` : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={shadow.native.card}
      className="flex-row items-center gap-3.5 rounded-xl bg-surface py-[17px] pl-4 pr-[19px]"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-tint">
        <Text className="font-sans text-lg font-semibold text-primary-strong">
          {avatarInitial(c.buyerNickname)}
        </Text>
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="font-sans text-lg font-semibold tracking-tight text-ink">
          {name}
        </Text>
        <Text numberOfLines={1} className="mt-1 font-sans text-xs tracking-tight text-muted">
          {c.lastMessagePreview ?? ''}
        </Text>
      </View>
      <View className="items-end gap-1.5">
        {time ? <Text className="font-sans text-xs tracking-tight text-muted">{time}</Text> : null}
        <Badge count={c.unreadCount} className="self-end" />
      </View>
    </Pressable>
  );
}
