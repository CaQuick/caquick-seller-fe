import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

import { Icon, type IconName } from './icon';

interface HeaderAction {
  label: string;
  onPress: () => void;
  /** 있으면 36px 아이콘 버튼, 없으면 보라 텍스트 버튼('수정') */
  icon?: IconName;
}

interface Props {
  title: string;
  /** 기본은 router.back(). null이면 뒤로가기를 숨긴다 */
  onBack?: (() => void) | null;
  right?: HeaderAction;
  className?: string;
}

/** 화면 헤더(.hdr): 뒤로가기 36 r12 테두리 · 가운데 제목 · 오른쪽 액션. 안전 영역은 Screen이 맡는다 */
export function AppHeader({ title, onBack = () => router.back(), right, className }: Props) {
  return (
    <View className={cn('flex-row items-center gap-2 px-5 pt-[33px]', className)}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={onBack}
          hitSlop={4}
          className="h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface"
        >
          <Icon name="back" size={24} color={colors.label} />
        </Pressable>
      ) : (
        <View className="w-9" />
      )}
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        className="flex-1 text-center font-sans text-2xl font-bold tracking-tighter text-text3"
      >
        {title}
      </Text>
      {right ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={right.label}
          onPress={right.onPress}
          hitSlop={4}
          className={cn(
            'h-9 items-center justify-center',
            right.icon ? 'w-9 rounded-lg' : 'min-w-9 px-0.5',
          )}
        >
          {right.icon ? (
            <Icon name={right.icon} size={20} color={colors.text2} />
          ) : (
            <Text className="font-sans text-md font-semibold tracking-tight text-primary-strong">
              {right.label}
            </Text>
          )}
        </Pressable>
      ) : (
        <View className="w-9" />
      )}
    </View>
  );
}
