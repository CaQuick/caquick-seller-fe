import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { showToast, TimeRow } from '@/shared/ui';

import { storeKeys } from '../api/queryKeys';
import { businessHoursQueryOptions, upsertBusinessHour } from '../api/schedule';
import { STORE_COPY, storeErrorMessage } from '../model/messages';
import { DAY_ORDER, dayHours, dayLabel } from '../model/summaries';
import { hmToTimeIso } from '../model/time';
import { FieldLabel, InfoBox, QueryGate, SubScreen } from './parts';

interface RowValue {
  open: boolean;
  start: string;
  end: string;
  error?: string;
}

const DEFAULT_RANGE = { start: '10:00', end: '19:00' };

/** 영업시간: 요일 7행, 바꾼 행만 바로 저장. 시작이 종료보다 늦으면 저장하지 않고 행 아래에 알린다 */
export function StoreBusinessHoursScreen() {
  const queryClient = useQueryClient();
  const hours = useQuery(businessHoursQueryOptions());
  const [drafts, setDrafts] = useState<Partial<Record<number, RowValue>>>({});

  const setDraft = (day: number, value: RowValue | undefined) =>
    setDrafts((d) => ({ ...d, [day]: value }));

  const rowValue = (day: number): RowValue => {
    const draft = drafts[day];
    if (draft) return draft;
    const h = hours.data ? dayHours(hours.data, day) : null;
    return h ? { open: true, ...h } : { open: false, ...DEFAULT_RANGE };
  };

  const save = async (day: number, { open, start, end }: RowValue) => {
    const next = { open, start, end };
    if (open && start >= end) {
      setDraft(day, { ...next, error: STORE_COPY.hoursOrder });
      return;
    }
    setDraft(day, next);
    try {
      await upsertBusinessHour({
        dayOfWeek: day,
        isClosed: !next.open,
        openTime: next.open ? hmToTimeIso(next.start) : null,
        closeTime: next.open ? hmToTimeIso(next.end) : null,
      });
      showToast.success(STORE_COPY.hoursSaved(dayLabel(day)));
      await queryClient.invalidateQueries({ queryKey: storeKeys.businessHours() });
    } catch (e) {
      showToast.error(storeErrorMessage(e));
    }
    setDraft(day, undefined);
  };

  return (
    <SubScreen title="영업시간">
      {hours.data ? (
        <ScrollView contentContainerClassName="px-5 pb-6">
          <FieldLabel first>요일별 영업시간</FieldLabel>
          <View className="gap-2.5">
            {DAY_ORDER.map((day) => {
              const row = rowValue(day);
              return (
                <View key={day}>
                  <TimeRow
                    label={dayLabel(day)}
                    sunday={day === 0}
                    open={row.open}
                    start={row.start}
                    end={row.end}
                    minuteInterval={10}
                    onOpenChange={(open) => void save(day, { ...row, open })}
                    onChange={(range) => void save(day, { ...row, ...range })}
                  />
                  {row.error ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      className="ml-11 mt-1 font-sans text-xs text-danger"
                    >
                      {row.error}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
          <InfoBox className="mt-5">{STORE_COPY.hoursHint}</InfoBox>
        </ScrollView>
      ) : (
        <QueryGate
          isPending={hours.isPending}
          error={hours.error}
          onRetry={() => void hours.refetch()}
        />
      )}
    </SubScreen>
  );
}
