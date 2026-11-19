import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { type RefObject, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { todayKst } from '@/shared/lib/kst';
import {
  Chip,
  ConfirmSheet,
  ErrorState,
  MonthCalendar,
  SkeletonRows,
  TextField,
} from '@/shared/ui';

import { pickupChangeCalendarQueryOptions, pickupChangeSlotsQueryOptions } from '../api/orders';
import {
  changeCalendar,
  initialPick,
  monthKeyOf,
  PICKUP_CHANGE_COPY,
  type SlotChip,
  slotChips,
  toPickupAt,
} from '../model/pickup-change';

const NOTE_MAX = 500;

function SlotRow({
  label,
  chips,
  selected,
  onPick,
}: {
  label: string;
  chips: SlotChip[];
  selected: string | null;
  onPick: (time: string) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <View className="flex-row items-start gap-2">
      <Text className="w-7 pt-1.5 font-sans text-sm text-label">{label}</Text>
      <View className="flex-1 flex-row flex-wrap gap-2">
        {chips.map((c) => (
          <Chip
            key={c.time}
            variant="filter"
            label={c.label}
            disabled={c.disabled}
            selected={c.time === selected}
            onPress={() => onPick(c.time)}
          />
        ))}
      </View>
    </View>
  );
}

interface Props {
  ref: RefObject<BottomSheetModal | null>;
  orderId: string;
  pickupAt: string;
  /** 시트가 열려 있을 때만 달력·슬롯을 부른다 */
  active: boolean;
  loading: boolean;
  /** 서버가 거절한 이유. 다시 고르면 onPick으로 지운다 */
  error: string | null;
  onPick: () => void;
  onDismiss: () => void;
  onSubmit: (input: { pickupAt: string; note?: string }) => void;
}

/** 픽업 일시 변경: 월 달력 → 그날 슬롯 칩 → 메모. 지금 일시와 예약 불가 슬롯은 고를 수 없다 */
export function PickupChangeSheet({
  ref,
  orderId,
  pickupAt,
  active,
  loading,
  error,
  onPick,
  onDismiss,
  onSubmit,
}: Props) {
  const { height } = useWindowDimensions();
  const [start] = useState(() => initialPick(pickupAt, new Date()));
  const [month, setMonth] = useState(start.month);
  const [picked, setPicked] = useState(start.date);
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const calendar = useQuery({
    ...pickupChangeCalendarQueryOptions(orderId, monthKeyOf(month)),
    enabled: active,
  });
  const cal = calendar.data ? changeCalendar(calendar.data) : null;
  const date = picked && cal?.selectable.has(picked) ? picked : null;
  const slots = useQuery({
    ...pickupChangeSlotsQueryOptions(orderId, date ?? ''),
    enabled: active && date !== null,
  });
  const morning = date && slots.data ? slotChips(slots.data.morning, date, pickupAt) : [];
  const afternoon = date && slots.data ? slotChips(slots.data.afternoon, date, pickupAt) : [];
  const chip = [...morning, ...afternoon].find((c) => c.time === time);
  const target = date && chip && !chip.disabled ? toPickupAt(date, chip.time) : null;
  const trimmed = note.trim();
  const pickTime = (t: string) => {
    setTime(t);
    onPick();
  };

  let slotArea;
  if (!date) {
    slotArea = <Text className="font-sans text-sm text-muted">{PICKUP_CHANGE_COPY.pickDay}</Text>;
  } else if (slots.data) {
    slotArea =
      morning.length + afternoon.length > 0 ? (
        <View className="gap-2">
          <SlotRow label="오전" chips={morning} selected={time} onPick={pickTime} />
          <SlotRow label="오후" chips={afternoon} selected={time} onPick={pickTime} />
        </View>
      ) : (
        <Text className="font-sans text-sm text-muted">{PICKUP_CHANGE_COPY.noSlots}</Text>
      );
  } else if (slots.isError) {
    slotArea = <ErrorState onRetry={() => void slots.refetch()} />;
  } else {
    slotArea = <SkeletonRows count={1} />;
  }

  return (
    <ConfirmSheet
      ref={ref}
      title={PICKUP_CHANGE_COPY.title}
      description={PICKUP_CHANGE_COPY.description}
      confirmLabel={PICKUP_CHANGE_COPY.confirm}
      tone="primary"
      confirmDisabled={!target}
      loading={loading}
      onDismiss={onDismiss}
      onConfirm={() =>
        target && onSubmit({ pickupAt: target, ...(trimmed ? { note: trimmed } : {}) })
      }
    >
      <ScrollView style={{ maxHeight: Math.round(height * 0.55) }}>
        {cal ? (
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            today={todayKst()}
            days={cal.marks}
            selected={date ? [date] : []}
            isDisabled={(ymd) => cal.blocked.has(ymd)}
            onSelectDay={(ymd) => {
              if (!cal.selectable.has(ymd)) return;
              setPicked(ymd);
              setTime(null);
              onPick();
            }}
            legend={['sel', 'off', 'full']}
          />
        ) : calendar.isError ? (
          <ErrorState onRetry={() => void calendar.refetch()} />
        ) : (
          <SkeletonRows count={2} card />
        )}
        {error ? (
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            className="mt-4 rounded-lg bg-danger-bg p-3"
          >
            <Text className="font-sans text-sm leading-[19px] tracking-tight text-danger">
              {error}
            </Text>
          </View>
        ) : null}
        <View className="mt-4">{slotArea}</View>
        <TextField
          sublabel="변경 메모 (선택)"
          accessibilityLabel="변경 메모"
          placeholder="구매자에게 전할 내용을 적어 주세요"
          multiline
          maxLength={NOTE_MAX}
          value={note}
          onChangeText={setNote}
          className="mt-4"
        />
      </ScrollView>
    </ConfirmSheet>
  );
}
