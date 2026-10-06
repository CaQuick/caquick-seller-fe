import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { type RefObject, useState } from 'react';
import { View } from 'react-native';

import { parseYmd, type YmdDate } from '@/shared/lib/kst';
import { AppBottomSheet, Button, MonthCalendar } from '@/shared/ui';

import { type DateRange, daysInRange, pickRangeDay } from '../model/filters';

interface Props {
  ref: RefObject<BottomSheetModal | null>;
  title: string;
  value: DateRange | null;
  today: YmdDate;
  onApply: (range: DateRange | null) => void;
}

interface Draft {
  from: string | null;
  to: string | null;
}

const draftOf = (value: DateRange | null): Draft => ({
  from: value?.from ?? null,
  to: value?.to ?? null,
});

/** 기간 시트: 달력에서 시작·끝을 차례로 누른다. 초기화는 기간 필터를 없앤다 */
export function PeriodSheet({ ref, title, value, today, onApply }: Props) {
  const [draft, setDraft] = useState(() => draftOf(value));
  const [month, setMonth] = useState(() => {
    const base = (value && parseYmd(value.from)) ?? today;
    return { y: base.y, m: base.m };
  });
  const apply = (range: DateRange | null) => {
    onApply(range);
    ref.current?.dismiss();
  };
  return (
    <AppBottomSheet ref={ref} title={title} onDismiss={() => setDraft(draftOf(value))}>
      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        today={today}
        selected={draft.from ? daysInRange(draft.from, draft.to) : []}
        onSelectDay={(ymd) => setDraft((d) => pickRangeDay(d, ymd))}
      />
      <View className="mt-5 flex-row gap-2">
        <View className="flex-1">
          <Button
            title="초기화"
            accessibilityLabel={`${title} 초기화`}
            variant="secondary"
            onPress={() => apply(null)}
          />
        </View>
        <View className="flex-1">
          <Button
            title="적용"
            accessibilityLabel={`${title} 적용`}
            disabled={!draft.from}
            onPress={() => draft.from && apply({ from: draft.from, to: draft.to ?? draft.from })}
          />
        </View>
      </View>
    </AppBottomSheet>
  );
}
