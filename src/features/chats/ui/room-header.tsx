import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { Icon } from '@/shared/ui';

import { CHATS_COPY } from '../model/copy';

interface Props {
  title: string;
  /** 이 구매자의 최근 주문이 있을 때만 '주문 보기'를 보인다 */
  hasOrder: boolean;
  onOrder: () => void;
  onMenu: () => void;
}

/** 채팅방 헤더(.hdr): 뒤로 · 닉네임 + '주문 보기' 지름길 · ⋯ 메뉴. 공용 헤더에 부제 자리가 없어 따로 둔다 */
export function RoomHeader({ title, hasOrder, onOrder, onMenu }: Props) {
  return (
    <View className="flex-row items-center gap-2 px-5 pt-[33px]">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
        onPress={() => router.back()}
        hitSlop={4}
        className="h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface"
      >
        <Icon name="back" size={24} color={colors.label} />
      </Pressable>
      <View className="flex-1 items-center">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="font-sans text-2xl font-bold tracking-tighter text-text3"
        >
          {title}
        </Text>
        {hasOrder ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={CHATS_COPY.menuOrder}
            onPress={onOrder}
            hitSlop={12}
          >
            <Text className="mt-0.5 font-sans text-xs font-medium text-primary-strong">
              {CHATS_COPY.orderLink}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={CHATS_COPY.menu}
        onPress={onMenu}
        hitSlop={4}
        className="h-9 w-9 items-center justify-center rounded-lg"
      >
        <Icon name="more" size={20} color={colors.text2} />
      </Pressable>
    </View>
  );
}
