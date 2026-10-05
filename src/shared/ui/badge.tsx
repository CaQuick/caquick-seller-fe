import { Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

interface Props {
  count: number;
  /** danger: 미읽음 · primary: 새 리뷰처럼 강조만 */
  tone?: 'danger' | 'primary';
  max?: number;
  className?: string;
}

/** 숫자 배지(.badge-n, r6). 0 이하면 그리지 않는다 */
export function Badge({ count, tone = 'danger', max = 99, className }: Props) {
  if (count <= 0) return null;
  return (
    <View
      accessibilityLabel={`${count}건`}
      className={cn(
        'h-[18px] min-w-[18px] items-center justify-center self-start rounded-badge px-[5px]',
        tone === 'danger' ? 'bg-danger' : 'bg-primary-strong',
        className,
      )}
    >
      <Text className="font-sans text-2xs font-bold text-surface">
        {count > max ? `${max}+` : count}
      </Text>
    </View>
  );
}
