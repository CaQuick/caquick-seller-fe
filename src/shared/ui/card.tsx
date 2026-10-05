import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

interface Props {
  title?: string;
  /** 제목 오른쪽(상태 칩·링크) */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** 흰 카드(.pcard r16·그림자) */
export function Card({ title, aside, children, className }: Props) {
  return (
    <View style={shadow.native.card} className={cn('rounded-xl bg-surface p-4', className)}>
      {title ? (
        <View className="mb-2 flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="font-sans text-md font-bold tracking-tight text-text2"
          >
            {title}
          </Text>
          {aside}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** 라벨·값 한 줄(.kv). total은 합계 줄(위 구분선·굵게·보라 값) */
export function KeyValue({
  label,
  value,
  total = false,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <View
      className={cn(
        'flex-row justify-between gap-3 py-[5px]',
        total && 'mt-1.5 border-t border-line2 pt-3',
      )}
    >
      <Text
        className={cn(
          'font-sans tracking-tight text-muted',
          total ? 'text-lg font-bold' : 'text-base',
        )}
      >
        {label}
      </Text>
      <Text
        className={cn(
          'flex-shrink text-right font-sans tracking-tight',
          total ? 'text-lg font-bold text-primary-strong' : 'text-base text-text',
        )}
      >
        {value}
      </Text>
    </View>
  );
}
