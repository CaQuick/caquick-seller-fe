import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { formatYmd, monthGrid, todayKst, type YearMonth } from '@/shared/lib/kst';
import {
  AppBottomSheet,
  Button,
  type CalendarDay,
  Empty,
  Icon,
  MenuGroup,
  MenuRow,
  MonthCalendar,
  showToast,
  TextField,
} from '@/shared/ui';

import { storeKeys } from '../api/queryKeys';
import {
  businessHoursQueryOptions,
  deleteSpecialClosure,
  specialClosuresQueryOptions,
  upsertSpecialClosure,
} from '../api/schedule';
import { STORE_COPY, storeErrorMessage } from '../model/messages';
import { dayHours, upcomingClosures } from '../model/summaries';
import { formatMonthDay, ymdToDateIso } from '../model/time';
import { FieldLabel, QueryGate, SubScreen } from './parts';

const weekdayOf = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

interface SheetProps {
  sheet: RefObject<BottomSheetModal | null>;
  todayYmd: string;
  /** 이미 휴무인 날: 등록된 특별휴무와 정기 휴무 요일 */
  closedDates: ReadonlySet<string>;
  closedWeekdays: ReadonlySet<number>;
}

function AddClosureSheet({ sheet, todayYmd, closedDates, closedWeekdays }: SheetProps) {
  const queryClient = useQueryClient();
  const today = todayKst();
  const [month, setMonth] = useState<YearMonth>({ y: today.y, m: today.m });
  const [date, setDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const isClosed = (ymd: string) => closedDates.has(ymd) || closedWeekdays.has(weekdayOf(ymd));

  const add = useMutation({
    mutationFn: () =>
      upsertSpecialClosure({
        closureDate: ymdToDateIso(date ?? ''),
        reason: reason.trim() || null,
      }),
    onSuccess: async () => {
      showToast.success(STORE_COPY.closureAdded);
      sheet.current?.dismiss();
      await queryClient.invalidateQueries({ queryKey: storeKeys.specialClosures() });
    },
    onError: (e) => showToast.error(storeErrorMessage(e)),
  });

  const days: Record<string, CalendarDay> = {};
  for (const cell of monthGrid(month)) {
    const ymd = formatYmd(cell);
    if (cell.inMonth && isClosed(ymd)) days[ymd] = { state: 'off' };
  }

  return (
    <AppBottomSheet
      ref={sheet}
      onDismiss={() => {
        setDate(null);
        setReason('');
      }}
    >
      <MonthCalendar
        month={month}
        onMonthChange={(next) => {
          // 지난 달로는 넘어가지 않는다
          if (next.y * 12 + next.m >= today.y * 12 + today.m) setMonth(next);
        }}
        today={today}
        days={days}
        selected={date ? [date] : []}
        isDisabled={(ymd) => ymd < todayYmd}
        onSelectDay={(ymd) => {
          if (!isClosed(ymd)) setDate(ymd);
        }}
        legend={['sel', 'off']}
      />
      <FieldLabel>사유</FieldLabel>
      <TextField
        accessibilityLabel="사유"
        placeholder="선택 입력 (비우면 '휴무')"
        value={reason}
        onChangeText={setReason}
        maxLength={200}
      />
      <View className="mt-5 flex-row gap-2">
        <View className="flex-1">
          <Button title="닫기" variant="secondary" onPress={() => sheet.current?.dismiss()} />
        </View>
        <View style={{ flex: 1.62 }}>
          <Button
            title="저장"
            disabled={!date}
            loading={add.isPending}
            onPress={() => add.mutate()}
          />
        </View>
      </View>
    </AppBottomSheet>
  );
}

/** 특별휴무: 다가오는 휴무 목록(날짜순) · × 즉시 삭제 · 달력 시트로 추가 */
export function StoreSpecialClosuresScreen() {
  const queryClient = useQueryClient();
  const sheet = useRef<BottomSheetModal>(null);
  const todayYmd = formatYmd(todayKst());
  const closures = useInfiniteQuery(specialClosuresQueryOptions());
  const hours = useQuery(businessHoursQueryOptions());
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = closures;

  // 날짜순 정렬은 전체가 있어야 맞다 — 남은 페이지를 이어 받는다
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const remove = useMutation({
    mutationFn: deleteSpecialClosure,
    onSuccess: async () => {
      showToast.success(STORE_COPY.closureDeleted);
      await queryClient.invalidateQueries({ queryKey: storeKeys.specialClosures() });
    },
    onError: (e) => showToast.error(storeErrorMessage(e)),
  });

  const items = closures.data
    ? upcomingClosures(
        closures.data.pages.flatMap((p) => p.items),
        todayYmd,
      )
    : null;
  const closedWeekdays = new Set(
    [0, 1, 2, 3, 4, 5, 6].filter((d) => hours.data && !dayHours(hours.data, d)),
  );
  const openSheet = () => sheet.current?.present();

  return (
    <SubScreen title="특별휴무">
      {items ? (
        <ScrollView contentContainerClassName="px-5 pb-6">
          {items.length > 0 ? (
            <>
              <FieldLabel first>예정된 휴무</FieldLabel>
              <MenuGroup>
                {items.map((c) => (
                  <MenuRow
                    key={c.id}
                    title={formatMonthDay(c.ymd)}
                    description={c.reason ?? STORE_COPY.closureDefaultReason}
                    accessory={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${formatMonthDay(c.ymd)} 휴무 삭제`}
                        disabled={remove.isPending}
                        onPress={() => remove.mutate(c.id)}
                        hitSlop={12}
                        className="h-11 w-8 items-center justify-center"
                      >
                        <Icon name="close" size={18} color={colors.muted} />
                      </Pressable>
                    }
                  />
                ))}
              </MenuGroup>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="휴무 추가"
                onPress={openSheet}
                className="mt-4 h-12 items-center justify-center rounded-sm border border-dashed border-border"
              >
                <Text className="font-sans text-base tracking-tight text-border">+ 휴무 추가</Text>
              </Pressable>
            </>
          ) : (
            <Empty
              icon="closure"
              title={STORE_COPY.closureEmpty}
              description={STORE_COPY.closureEmptyHint}
              action={<Button title="휴무 추가" size="sm" onPress={openSheet} />}
            />
          )}
        </ScrollView>
      ) : (
        <QueryGate
          isPending={closures.isPending}
          error={closures.error}
          onRetry={() => void closures.refetch()}
        />
      )}
      <AddClosureSheet
        sheet={sheet}
        todayYmd={todayYmd}
        closedDates={new Set(items?.map((c) => c.ymd))}
        closedWeekdays={closedWeekdays}
      />
    </SubScreen>
  );
}
