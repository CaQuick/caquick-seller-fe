import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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

  // 같은 요일 저장을 줄 세운다 — 동시에 보내면 늦게 반영된 앞 편집이 마지막 편집을 덮을 수 있다
  const queues = useRef(new Map<number, Promise<void>>());
  const latest = useRef(new Map<number, number>());

  const save = (day: number, { open, start, end }: RowValue) => {
    const next = { open, start, end };
    const seq = (latest.current.get(day) ?? 0) + 1;
    latest.current.set(day, seq);
    if (open && start >= end) {
      setDraft(day, { ...next, error: STORE_COPY.hoursOrder });
      return;
    }
    setDraft(day, next);
    const isLatest = () => latest.current.get(day) === seq;
    const send = async () => {
      // 기다리는 사이 더 새 편집이 왔으면 그것만 보낸다
      if (!isLatest()) return;
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
      if (isLatest()) setDraft(day, undefined);
    };
    const queued = (queues.current.get(day) ?? Promise.resolve()).then(send);
    queues.current.set(day, queued);
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
                    onOpenChange={(open) => save(day, { ...row, open })}
                    onChange={(range) => save(day, { ...row, ...range })}
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
