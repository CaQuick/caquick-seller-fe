import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

interface Props extends Omit<TextInputProps, 'style' | 'className'> {
  label?: string;
  /** 필드 아래 빨간 문구. zod·REST fieldErrors 값을 그대로 넣는다 */
  error?: string | null;
  /** 단위 접미(원·개·분) */
  suffix?: string;
  className?: string;
}

export function TextField({
  label,
  error,
  suffix,
  multiline,
  className,
  accessibilityLabel,
  ...input
}: Props) {
  return (
    <View className={className}>
      {label ? (
        <Text className="mb-2 font-sans text-sm font-medium text-label">{label}</Text>
      ) : null}
      <View
        className={cn(
          'flex-row rounded-sm border bg-surface px-4',
          multiline ? 'min-h-[98px] items-start py-3' : 'h-12 items-center',
          error ? 'border-danger' : 'border-border',
        )}
      >
        <TextInput
          {...input}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={colors.placeholder}
          className="flex-1 font-sans text-md tracking-tight text-text"
        />
        {suffix ? <Text className="ml-2 font-sans text-md text-sublabel">{suffix}</Text> : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-1 font-sans text-xs text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
