import { Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

interface Props {
  /** 0~5. 반올림한 개수만큼 채운다 */
  value: number;
  size?: 'sm' | 'lg';
  /** 오른쪽에 '4.0' */
  showValue?: boolean;
}

/** 별점(.stars). 읽기 전용 */
export function Stars({ value, size = 'sm', showValue = false }: Props) {
  const filled = Math.round(Math.min(5, Math.max(0, value)));
  return (
    <View
      accessible
      accessibilityLabel={`별점 5점 중 ${value.toFixed(1)}점`}
      className={cn('flex-row items-center', size === 'lg' ? 'gap-1.5' : 'gap-px')}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Text
          key={i}
          testID={i < filled ? 'star-on' : 'star-off'}
          className={cn(
            size === 'lg' ? 'text-6xl' : 'text-base',
            i < filled ? 'text-star' : 'text-chip-border',
          )}
        >
          ★
        </Text>
      ))}
      {showValue ? (
        <Text className="ml-1 font-sans text-sm font-semibold text-label">{value.toFixed(1)}</Text>
      ) : null}
    </View>
  );
}
