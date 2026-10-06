import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

interface Props {
  value: number;
  onChange: (value: number) => void;
  /** 버튼 라벨 앞에 붙는다('최소 수량 줄이기') */
  accessibilityLabel: string;
  min?: number;
  max?: number;
  step?: number;
  /** lg: 48px(일별 생산 수량) */
  size?: 'md' | 'lg';
}

/** 숫자 스테퍼(.stepper). 범위 끝에서는 그 방향 버튼을 끈다 */
export function Stepper({
  value,
  onChange,
  accessibilityLabel,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  size = 'md',
}: Props) {
  const lg = size === 'lg';
  const button = (sign: -1 | 1) => {
    const disabled = sign < 0 ? value <= min : value >= max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} ${sign < 0 ? '줄이기' : '늘리기'}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onChange(Math.min(max, Math.max(min, value + sign * step)))}
        hitSlop={lg ? 0 : 4}
        className={cn('h-full items-center justify-center bg-gray2', lg ? 'w-12' : 'w-9')}
      >
        <Text className={cn('font-sans text-lg', disabled ? 'text-placeholder2' : 'text-label')}>
          {sign < 0 ? '−' : '+'}
        </Text>
      </Pressable>
    );
  };
  return (
    <View
      className={cn(
        'flex-row self-start overflow-hidden rounded-sm border border-border bg-surface',
        lg ? 'h-12' : 'h-9',
      )}
    >
      {button(-1)}
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ now: value, min, max }}
        className={cn('items-center justify-center', lg ? 'w-[72px]' : 'w-12')}
      >
        <Text
          className={cn(
            'font-sans font-semibold tracking-tight text-text',
            lg ? 'text-3xl' : 'text-lg',
          )}
        >
          {value}
        </Text>
      </View>
      {button(1)}
    </View>
  );
}
