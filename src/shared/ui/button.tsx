import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

/** soft: 필수값을 채우기 전 '다음' · dangerOutline: 흰 바탕 위험 버튼(상품 삭제) */
export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'dangerOutline';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** sm: 40px·14px·내용 폭(빈 상태·카드 안 버튼) */
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  /** 홈 CTA(50px pill) — pill 허용 예외 */
  pill?: boolean;
  className?: string;
  accessibilityLabel?: string;
  testID?: string;
}

const BOX: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'border border-line2 bg-surface',
  soft: 'bg-primary-soft',
  danger: 'bg-danger',
  dangerOutline: 'border border-danger-bg bg-surface',
};
const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-surface',
  secondary: 'text-label',
  soft: 'text-surface',
  danger: 'text-surface',
  dangerOutline: 'text-danger',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  pill = false,
  className,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  // 비활성은 투명도 대신 시안 .btn.dis 색, 진행 중인 primary는 연한 색(로그인 중)
  const box = pill
    ? 'bg-primary-strong'
    : disabled && !loading
      ? 'bg-track'
      : BOX[loading && variant === 'primary' ? 'soft' : variant];
  const onLight = variant === 'secondary' || variant === 'dangerOutline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      hitSlop={size === 'sm' ? 2 : 0}
      className={cn(
        'flex-row items-center justify-center',
        pill
          ? 'h-[50px] rounded-full px-6'
          : size === 'sm'
            ? 'h-10 self-start rounded-sm px-4'
            : 'h-12 rounded-sm px-4',
        box,
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={onLight ? colors.label : colors.surface} />
      ) : (
        <Text
          numberOfLines={1}
          className={cn(
            'font-sans tracking-tight',
            pill ? 'text-md font-medium' : size === 'sm' ? 'text-base' : 'text-lg',
            disabled ? 'text-placeholder' : pill ? 'text-surface' : LABEL[variant],
          )}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
