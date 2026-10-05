import { Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

export type StatusTone = 'primary' | 'positive' | 'caution' | 'negative' | 'neutral';

const TONES: Record<StatusTone, { box: string; text: string }> = {
  primary: { box: 'bg-tint', text: 'text-primary-strong' },
  positive: { box: 'bg-mint-bg', text: 'text-mint-text' },
  caution: { box: 'bg-gray2', text: 'text-tag-dark' },
  negative: { box: 'bg-danger-bg', text: 'text-danger' },
  neutral: { box: 'bg-tag-light', text: 'text-label' },
};

/** 상태 표시(주문 상태·노출 여부). 색은 의미(tone)로만 고르고, 문구가 있어 색만으로 구분하지 않는다 */
export function StatusChip({
  tone,
  label,
  className,
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  return (
    <View
      accessibilityLabel={label}
      className={cn('self-start rounded-xs px-2 py-1', TONES[tone].box, className)}
    >
      <Text className={cn('font-sans text-xs font-semibold', TONES[tone].text)}>{label}</Text>
    </View>
  );
}
