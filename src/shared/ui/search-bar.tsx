import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

import { Icon } from './icon';

interface Props extends Omit<TextInputProps, 'style' | 'className' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  /** 접근성 이름. 없으면 placeholder */
  accessibilityLabel?: string;
  className?: string;
}

/** 검색바(.search, 44 r10). 값이 있으면 지우기 × */
export function SearchBar({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  className,
  ...input
}: Props) {
  return (
    <View className={cn('h-11 flex-row items-center gap-2 rounded-md bg-gray2 px-3.5', className)}>
      <Icon name="search" size={18} color={colors.muted} />
      <TextInput
        {...input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        placeholderTextColor={colors.placeholder}
        cursorColor={colors.caret}
        selectionColor={colors.caret}
        returnKeyType="search"
        className="h-full flex-1 font-sans text-md tracking-tight text-text"
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="검색어 지우기"
          onPress={() => onChangeText('')}
          hitSlop={13}
        >
          <Text className="font-sans text-2xl text-placeholder2">×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
