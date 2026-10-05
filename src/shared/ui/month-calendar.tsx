import { Pressable, Text, View } from 'react-native';

import { colors, shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import {
  addMonths,
  formatYmd,
  monthGrid,
  WEEKDAYS_KO,
  type YearMonth,
  type YmdDate,
} from '@/shared/lib/kst';

import { Icon } from './icon';

/** off 휴무 · full 마감 */
export interface CalendarDay {
  state?: 'off' | 'full';
  /** 칸 아래 작은 글자(제작 가능 수량·'휴무'·'마감') */
  caption?: string;
}

interface Props {
  month: YearMonth;
  onMonthChange: (month: YearMonth) => void;
  /** 'YYYY-MM-DD' → 표시 */
  days?: Readonly<Record<string, CalendarDay>>;
  selected?: readonly string[];
  today?: YmdDate;
  onSelectDay?: (ymd: string) => void;
  /** 범례에 보일 항목 */
  legend?: readonly ('sel' | 'off' | 'full')[];
}

const CELL: Record<
  'sel' | 'off' | 'full' | 'none',
  { box: string; text: string; caption: string }
> = {
  sel: { box: 'bg-primary', text: 'text-surface', caption: 'text-surface' },
  off: { box: 'bg-danger-bg', text: 'text-danger', caption: 'text-danger' },
  full: { box: 'bg-gray-bg', text: 'text-muted line-through', caption: 'text-muted' },
  none: { box: '', text: 'text-text2', caption: 'text-primary-strong' },
};
const LEGEND = {
  sel: ['선택', 'bg-primary'],
  off: ['휴무', 'border border-danger bg-danger-bg'],
  full: ['마감', 'border border-chip-border bg-gray-bg'],
} as const;
const STATE_LABEL = { off: '휴무', full: '마감' } as const;

/** 월 달력(.cal). 7×6 칸 순수 RN 그리드, 앞뒤 달 날짜는 흐리게 두고 누르지 않는다 */
export function MonthCalendar({
  month,
  onMonthChange,
  days = {},
  selected = [],
  today,
  onSelectDay,
  legend,
}: Props) {
  const todayYmd = today ? formatYmd(today) : null;
  const cells = monthGrid(month);
  const nav = (delta: -1 | 1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta < 0 ? '이전 달' : '다음 달'}
      onPress={() => onMonthChange(addMonths(month, delta))}
      hitSlop={8}
      className="h-7 w-7 items-center justify-center"
    >
      <Icon name={delta < 0 ? 'chevronLeft' : 'chevronRight'} size={18} color={colors.label} />
    </Pressable>
  );
  return (
    <View style={shadow.native.card} className="rounded-xl bg-surface px-3 py-4">
      <View className="flex-row items-center justify-between px-1 pb-3">
        {nav(-1)}
        <Text
          accessibilityRole="header"
          className="font-sans text-lg font-semibold tracking-tight text-text"
        >
          {`${month.y}년 ${month.m}월`}
        </Text>
        {nav(1)}
      </View>
      <View className="flex-row pb-1.5">
        {WEEKDAYS_KO.map((w, i) => (
          <Text
            key={w}
            className={cn(
              'flex-1 text-center font-sans text-xs',
              i === 0 ? 'text-danger' : 'text-muted',
            )}
          >
            {w}
          </Text>
        ))}
      </View>
      <View className="gap-1">
        {Array.from({ length: 6 }, (_, week) => (
          <View key={week} className="flex-row">
            {cells.slice(week * 7, week * 7 + 7).map((cell) => {
              const ymd = formatYmd(cell);
              const info = cell.inMonth ? days[ymd] : undefined;
              const isSel = cell.inMonth && selected.includes(ymd);
              const look = CELL[isSel ? 'sel' : (info?.state ?? 'none')];
              const stateLabel = info?.state && STATE_LABEL[info.state];
              const label = [
                `${cell.m}월 ${cell.d}일`,
                stateLabel,
                info?.caption !== stateLabel && info?.caption,
              ]
                .filter(Boolean)
                .join(', ');
              return (
                <Pressable
                  key={ymd}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isSel, disabled: !cell.inMonth }}
                  disabled={!cell.inMonth || !onSelectDay}
                  onPress={() => onSelectDay?.(ymd)}
                  className={cn(
                    'h-11 flex-1 items-center justify-center gap-px rounded-md',
                    cell.inMonth && look.box,
                    ymd === todayYmd && !isSel && 'border border-primary',
                  )}
                >
                  <Text
                    className={cn(
                      'font-sans text-base',
                      cell.inMonth ? look.text : 'text-placeholder2',
                    )}
                  >
                    {cell.d}
                  </Text>
                  {info?.caption ? (
                    <Text className={cn('font-sans text-3xs font-semibold', look.caption)}>
                      {info.caption}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {legend?.length ? (
        <View className="flex-row gap-3.5 px-1 pt-3">
          {legend.map((key) => (
            <View key={key} className="flex-row items-center gap-1">
              <View className={cn('h-2.5 w-2.5 rounded-[3px]', LEGEND[key][1])} />
              <Text className="font-sans text-xs text-muted">{LEGEND[key][0]}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
