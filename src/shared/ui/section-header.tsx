import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

interface Props {
  title: string;
  /** 제목 옆 회색 숫자('48', '1건') */
  count?: string | number;
  action?: { label: string; onPress: () => void };
  className?: string;
}

/** 화면 안 섹션 제목(.sec-h 16/700). 홈 섹션 제목(20px)보다 한 단계 작다 */
export function SectionHeader({ title, count, action, className }: Props) {
  return (
    <View className={cn('flex-row items-end justify-between pb-2.5 pt-6', className)}>
      <Text
        accessibilityRole="header"
        className="font-sans text-lg font-bold tracking-tight text-text2"
      >
        {title}
        {count !== undefined ? (
          <Text className="font-sans text-sm font-normal text-muted">{` ${count}`}</Text>
        ) : null}
      </Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={13}>
          <Text className="font-sans text-sm tracking-tight text-muted">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
