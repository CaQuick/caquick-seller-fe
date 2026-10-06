import { Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

/** 시안 .st 색(gray 접수 · purple 확정 · mint 제작 완료 · done 픽업 완료 · red 취소·거절) */
type StatusColor = 'gray' | 'purple' | 'mint' | 'done' | 'red';
/** 의미 이름은 기존 호출부 호환 */
export type StatusTone = StatusColor | 'primary' | 'positive' | 'caution' | 'negative' | 'neutral';

const ALIAS: Record<StatusTone, StatusColor> = {
  gray: 'gray',
  purple: 'purple',
  mint: 'mint',
  done: 'done',
  red: 'red',
  neutral: 'gray',
  caution: 'gray',
  primary: 'purple',
  positive: 'mint',
  negative: 'red',
};

const COLORS: Record<StatusColor, { box: string; text: string }> = {
  gray: { box: 'bg-gray-bg', text: 'text-muted' },
  purple: { box: 'bg-tint', text: 'text-purple-text' },
  mint: { box: 'bg-mint-bg', text: 'text-mint-text' },
  done: { box: 'bg-track2', text: 'text-label' },
  red: { box: 'bg-danger-bg', text: 'text-danger' },
};

/** 상태 표시(주문 상태·노출 여부). 26px r8 — pill로 그리지 않는다(D43). 문구가 있어 색만으로 구분하지 않는다 */
export function StatusChip({
  tone,
  label,
  className,
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  const color = COLORS[ALIAS[tone]];
  return (
    <View
      accessibilityLabel={label}
      className={cn(
        'h-[26px] min-w-[55px] items-center justify-center self-start rounded-sm px-3',
        color.box,
        className,
      )}
    >
      <Text
        numberOfLines={1}
        className={cn('font-sans text-xs font-medium tracking-tight', color.text)}
      >
        {label}
      </Text>
    </View>
  );
}
