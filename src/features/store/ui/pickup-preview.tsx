import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ApiError } from '@/shared/api';
import { todayKst, type YearMonth } from '@/shared/lib/kst';
import { Chip, ErrorState, MonthCalendar, SkeletonRows } from '@/shared/ui';

import { pickupCalendarQueryOptions, pickupSlotsQueryOptions } from '../api/schedule';
import { previewCalendar } from '../model/calendar';
import { STORE_COPY } from '../model/messages';
import { describeLeadTime } from '../model/summaries';
import { formatMonthDay, monthKey } from '../model/time';
import { InfoBox, SectionTitle } from './parts';

function SlotRow({
  label,
  slots,
}: {
  label: string;
  slots: { time: string; available: boolean }[];
}) {
  if (slots.length === 0) return null;
  return (
    <View className="mt-2 flex-row items-center gap-2">
      <Text className="w-7 font-sans text-sm text-label">{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {slots.map((s) => (
          <Chip key={s.time} variant="filter" label={s.time} disabled={!s.available} />
        ))}
      </ScrollView>
    </View>
  );
}

function Slots({ storeId, date, interval }: { storeId: string; date: string; interval: number }) {
  const slots = useQuery(pickupSlotsQueryOptions(storeId, date));
  const count = slots.data ? slots.data.morning.length + slots.data.afternoon.length : 0;
  return (
    <>
      <SectionTitle
        title="픽업 시간 슬롯"
        sub={formatMonthDay(date)}
        aside={slots.data ? `${interval}분 간격 · ${count}칸` : undefined}
      />
      {slots.data ? (
        count > 0 ? (
          <>
            <SlotRow label="오전" slots={slots.data.morning} />
            <SlotRow label="오후" slots={slots.data.afternoon} />
          </>
        ) : (
          <Text className="font-sans text-sm text-muted">이날은 픽업 시간이 없어요</Text>
        )
      ) : slots.error ? (
        <ErrorState onRetry={() => void slots.refetch()} />
      ) : (
        <SkeletonRows count={1} />
      )}
    </>
  );
}

interface Props {
  storeId: string;
  isActive: boolean;
  policy: { pickupSlotIntervalMinutes: number; minLeadTimeMinutes: number };
}

/** 저장된 정책으로 구매자가 보는 달력·슬롯을 그대로 그린다 */
export function PickupPreview({ storeId, isActive, policy }: Props) {
  const today = todayKst();
  const [month, setMonth] = useState<YearMonth>({ y: today.y, m: today.m });
  const [picked, setPicked] = useState<string | null>(null);
  const calendar = useQuery({
    ...pickupCalendarQueryOptions(storeId, monthKey(month)),
    enabled: isActive,
  });
  const notFound =
    calendar.error instanceof ApiError && calendar.error.classification === 'NOT_FOUND';

  const header = (
    <SectionTitle
      title="구매자 달력 미리보기"
      aside={`${policy.minLeadTimeMinutes}분 = ${describeLeadTime(policy.minLeadTimeMinutes)}`}
    />
  );
  if (!isActive || notFound) {
    return (
      <>
        {header}
        <InfoBox>{STORE_COPY.inactiveStore}</InfoBox>
      </>
    );
  }
  if (!calendar.data) {
    return (
      <>
        {header}
        {calendar.error ? (
          <ErrorState onRetry={() => void calendar.refetch()} />
        ) : (
          <SkeletonRows count={2} card />
        )}
      </>
    );
  }
  const { days, blocked } = previewCalendar(calendar.data.days);
  const selectable = calendar.data.days.filter((d) => d.selectable).map((d) => d.date);
  const date = picked && selectable.includes(picked) ? picked : selectable[0];
  return (
    <>
      {header}
      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        today={today}
        days={days}
        selected={date ? [date] : []}
        isDisabled={(ymd) => blocked.has(ymd)}
        onSelectDay={(ymd) => {
          if (selectable.includes(ymd)) setPicked(ymd);
        }}
        legend={['sel', 'off', 'full']}
      />
      {date ? (
        <Slots storeId={storeId} date={date} interval={policy.pickupSlotIntervalMinutes} />
      ) : null}
    </>
  );
}
