import { Pressable, Text } from 'react-native';

import { cn } from '@/shared/lib/cn';

interface Props {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** 32px 작은 칩(태그 목록) */
  small?: boolean;
  className?: string;
}

/** 선택 칩(필터·카테고리·태그). 선택 상태는 색과 accessibilityState 둘 다로 드러낸다 */
export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
  small,
  className,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'items-center justify-center rounded-full border',
        small ? 'h-8 px-3' : 'h-[37px] px-4',
        selected ? 'border-primary bg-primary' : 'border-chip-border bg-surface',
        disabled && 'opacity-40',
        className,
      )}
    >
      <Text
        className={cn(
          'font-sans text-sm font-medium tracking-tight',
          selected ? 'text-surface' : 'text-label',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
