import { Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

/** done 지난 단계 · now 현재 · todo 남은 단계 · bad 거절·취소 */
export type TimelineState = 'done' | 'now' | 'todo' | 'bad';

export interface TimelineItem {
  key: string;
  title: string;
  state: TimelineState;
  /** '10월 5일 20:14 · 김다은' */
  at?: string;
  memo?: string;
}

const DOT: Record<TimelineState, string> = {
  done: 'border-primary bg-primary',
  now: 'border-primary-strong bg-primary-strong',
  todo: 'border-chip-off bg-surface',
  bad: 'border-danger bg-danger',
};
const STATE_LABEL: Record<TimelineState, string> = {
  done: '완료',
  now: '현재 단계',
  todo: '예정',
  bad: '중단',
};

/** 주문 진행·조작 이력(.timeline). 마지막 행은 세로선이 없다 */
export function Timeline({ items }: { items: readonly TimelineItem[] }) {
  return (
    <View className="py-1">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <View
            key={item.key}
            accessible
            accessibilityLabel={`${item.title}, ${STATE_LABEL[item.state]}${item.at ? `, ${item.at}` : ''}`}
            className={cn('flex-row gap-2.5', !last && 'pb-[18px]')}
          >
            {last ? null : (
              <View
                testID="timeline-line"
                className="absolute bottom-0 left-[9px] top-4 w-0.5 bg-line"
              />
            )}
            <View className="h-5 w-5 items-center justify-center">
              <View
                className={cn(
                  'items-center justify-center rounded-full',
                  item.state === 'now' ? 'h-[18px] w-[18px] bg-tint' : 'h-2.5 w-2.5',
                )}
              >
                <View className={cn('h-2.5 w-2.5 rounded-full border-2', DOT[item.state])} />
              </View>
            </View>
            <View className="flex-1">
              <Text
                className={cn(
                  'font-sans text-md tracking-tight',
                  item.state === 'todo' ? 'font-medium text-muted' : 'font-semibold text-text',
                )}
              >
                {item.title}
              </Text>
              {item.at ? (
                <Text className="mt-0.5 font-sans text-xs tracking-tight text-muted">
                  {item.at}
                </Text>
              ) : null}
              {item.memo ? (
                <Text className="mt-1.5 rounded-md bg-tint2 px-2.5 py-2 font-sans text-sm tracking-tight text-text3">
                  {item.memo}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
