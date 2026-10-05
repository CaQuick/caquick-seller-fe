import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type RefObject, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { formatYmd, todayKst, type YearMonth } from '@/shared/lib/kst';
import { AppBottomSheet, Button, MonthCalendar, showToast, Stepper } from '@/shared/ui';

import { myStoreQueryOptions } from '../api/my-store';
import { storeKeys } from '../api/queryKeys';
import {
  dailyCapacitiesQueryOptions,
  deleteDailyCapacity,
  pickupCalendarQueryOptions,
  upsertDailyCapacity,
} from '../api/schedule';
import { capacityCalendarDays } from '../model/calendar';
import { STORE_COPY, storeErrorMessage } from '../model/messages';
import {
  dateIsoToYmd,
  formatMonthDay,
  monthDateRange,
  monthKey,
  ymdToDateIso,
} from '../model/time';
import { InfoBox, QueryGate, SubScreen } from './parts';

/** BE MIN/MAX_DAILY_CAPACITY */
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 5000;
const CAPACITY_START = 10;

interface Existing {
  id: string;
  capacity: number;
}

function CapacitySheet({
  sheet,
  date,
  existing,
}: {
  sheet: RefObject<BottomSheetModal | null>;
  date: string | null;
  existing?: Existing;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState<number | null>(null);
  const current = value ?? existing?.capacity ?? CAPACITY_START;
  const done = async (message: string) => {
    showToast.success(message);
    sheet.current?.dismiss();
    await queryClient.invalidateQueries({ queryKey: storeKeys.all });
  };
  const onError = (e: unknown) => showToast.error(storeErrorMessage(e));
  const save = useMutation({
    mutationFn: () =>
      upsertDailyCapacity({
        capacityId: existing?.id ?? null,
        capacityDate: ymdToDateIso(date ?? ''),
        capacity: current,
      }),
    onSuccess: () => done(STORE_COPY.capacitySaved),
    onError,
  });
  const clear = useMutation({
    mutationFn: () => deleteDailyCapacity(existing?.id ?? ''),
    onSuccess: () => done(STORE_COPY.capacityCleared),
    onError,
  });
  return (
    <AppBottomSheet ref={sheet} onDismiss={() => setValue(null)}>
      <Text
        accessibilityRole="header"
        className="my-2 text-center font-sans text-2xl font-bold tracking-tighter text-ink"
      >
        {date ? formatMonthDay(date, true) : ''}
      </Text>
      <Text className="mb-6 text-center font-sans text-base tracking-tight text-muted">
        {STORE_COPY.capacitySheet}
      </Text>
      <View className="mb-6 items-center">
        <Stepper
          size="lg"
          accessibilityLabel="생산 수량"
          value={current}
          min={CAPACITY_MIN}
          max={CAPACITY_MAX}
          onChange={setValue}
        />
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            title="제한 없음으로"
            variant="dangerOutline"
            disabled={!existing}
            loading={clear.isPending}
            onPress={() => clear.mutate()}
          />
        </View>
        <View className="flex-1">
          <Button title="저장" loading={save.isPending} onPress={() => save.mutate()} />
        </View>
      </View>
    </AppBottomSheet>
  );
}

/** 일별 생산 수량: 달력 칸 캡션이 그날 수량, 구매자 달력의 휴무·마감을 겹쳐 보인다 */
export function StoreDailyCapacitiesScreen() {
  const today = todayKst();
  const todayYmd = formatYmd(today);
  const sheet = useRef<BottomSheetModal>(null);
  const [month, setMonth] = useState<YearMonth>({ y: today.y, m: today.m });
  const [date, setDate] = useState<string | null>(null);
  const key = monthKey(month);
  const store = useQuery(myStoreQueryOptions());
  const capacities = useQuery(dailyCapacitiesQueryOptions(key, monthDateRange(month)));
  // 비공개 매장은 구매자 달력이 NOT_FOUND — 겹침 없이 수량만 보인다
  const calendar = useQuery({
    ...pickupCalendarQueryOptions(store.data?.id ?? '', key),
    enabled: store.data?.isActive === true,
  });

  const byDate = new Map(
    capacities.data?.items.map((c) => [dateIsoToYmd(c.capacityDate), c] as const),
  );
  return (
    <SubScreen title="일별 생산 수량">
      {capacities.data ? (
        <ScrollView contentContainerClassName="px-5 pb-6 pt-5">
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            today={today}
            days={capacityCalendarDays(capacities.data.items, calendar.data?.days)}
            selected={date ? [date] : []}
            isDisabled={(ymd) => ymd < todayYmd}
            onSelectDay={(ymd) => {
              setDate(ymd);
              sheet.current?.present();
            }}
            legend={['sel', 'off', 'full']}
          />
          <InfoBox className="mt-4">{STORE_COPY.capacityHint}</InfoBox>
        </ScrollView>
      ) : (
        <QueryGate
          isPending={capacities.isPending}
          error={capacities.error}
          onRetry={() => void capacities.refetch()}
        />
      )}
      <CapacitySheet sheet={sheet} date={date} existing={date ? byDate.get(date) : undefined} />
    </SubScreen>
  );
}
