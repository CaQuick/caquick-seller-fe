import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

export type ButtonVariant = 'primary' | 'secondary';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** 시안 CTA(50px 알약형) */
  pill?: boolean;
  className?: string;
  accessibilityLabel?: string;
  testID?: string;
}

const BOX: Record<ButtonVariant, string> = {
  primary: 'bg-primary-strong',
  secondary: 'bg-tint',
};
const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-surface',
  secondary: 'text-primary-strong',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  pill = false,
  className,
  accessibilityLabel,
  testID,
}: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      className={cn(
        'flex-row items-center justify-center',
        pill ? 'h-[50px] rounded-full px-6' : 'h-12 rounded-sm px-4',
        BOX[variant],
        inactive && 'opacity-40',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.primaryStrong} />
      ) : (
        <Text className={cn('font-sans text-lg font-semibold tracking-tight', LABEL[variant])}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
