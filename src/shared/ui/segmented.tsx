import { Pressable, ScrollView, Text, View } from 'react-native';

import { shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

interface Item<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  items: readonly Item<T>[];
  value: T;
  onChange: (value: T) => void;
  /** pill: 회색 트랙 위 흰 칸(.segc) · underline: 밑줄 탭(.seg) */
  variant?: 'pill' | 'underline';
  /** underline에서 칸이 많으면 가로 스크롤(주문 상태 6칸) */
  scrollable?: boolean;
  accessibilityLabel?: string;
  className?: string;
}

/** 세그먼트·탭. 선택은 accessibilityState.selected로도 드러낸다 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  variant = 'pill',
  scrollable = false,
  accessibilityLabel,
  className,
}: Props<T>) {
  const pill = variant === 'pill';
  const tabs = items.map((item) => {
    const on = item.value === value;
    return (
      <Pressable
        key={item.value}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: on }}
        onPress={() => onChange(item.value)}
        hitSlop={pill ? 5 : 2}
        style={pill && on ? shadow.native.segment : undefined}
        className={cn(
          'items-center justify-center',
          pill ? 'h-[34px] flex-1 rounded-sm' : 'pb-[11px] pt-[13px]',
          pill && on && 'bg-surface',
          !pill && (scrollable ? 'px-3' : 'flex-1'),
        )}
      >
        <Text
          numberOfLines={1}
          className={cn(
            'font-sans text-base tracking-tight',
            pill ? (on ? 'font-semibold text-text' : 'font-medium text-muted') : 'text-text2',
            !pill && on && 'font-semibold',
          )}
        >
          {item.label}
        </Text>
        {!pill && on ? (
          <View className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary" />
        ) : null}
      </Pressable>
    );
  });
  if (pill) {
    return (
      <View
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
        className={cn('flex-row rounded-md bg-track2 p-[3px]', className)}
      >
        {tabs}
      </View>
    );
  }
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      className={cn('border-b border-line2', className)}
    >
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-2"
        >
          {tabs}
        </ScrollView>
      ) : (
        <View className="flex-row">{tabs}</View>
      )}
    </View>
  );
}
