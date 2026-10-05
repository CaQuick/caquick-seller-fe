import { Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

/** 40×24 스위치(.toggle). RN Switch는 플랫폼마다 크기·색이 달라 시안대로 그린다 */
export function Switch({ value, onValueChange, accessibilityLabel, disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={10}
      className={cn(
        'h-6 w-10 justify-center rounded-full px-0.5',
        value ? 'items-end bg-primary' : 'items-start bg-switch-off',
        disabled && 'opacity-40',
      )}
    >
      <View className="h-5 w-5 rounded-full bg-surface" />
    </Pressable>
  );
}
