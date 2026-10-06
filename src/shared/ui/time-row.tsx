import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

import { Button } from './button';
import { Switch } from './switch';

const pad = (n: number) => String(n).padStart(2, '0');
/** 'HH:mm' ↔ 피커 Date. 시각만 다루므로 기기 시간대를 그대로 쓴다 */
export const hmToDate = (hm: string) => {
  const [h = 0, m = 0] = hm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m);
};
export const dateToHm = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

interface PickerProps {
  value: string;
  title: string;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  onDone: (hm: string | null) => void;
}

/** Android는 네이티브 시간 대화상자, iOS는 모달 안 스피너 + 완료 */
function TimePickerModal({ value, title, minuteInterval, onDone }: PickerProps) {
  const [draft, setDraft] = useState(value);
  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        mode="time"
        is24Hour
        value={hmToDate(value)}
        minuteInterval={minuteInterval}
        onValueChange={(_, date) => onDone(dateToHm(date))}
        onDismiss={() => onDone(null)}
      />
    );
  }
  return (
    <Modal transparent animationType="fade" onRequestClose={() => onDone(null)}>
      <Pressable accessibilityLabel="닫기" className="flex-1 bg-dim" onPress={() => onDone(null)} />
      <View className="rounded-t-sheet bg-surface px-5 pb-8 pt-4">
        <Text
          accessibilityRole="header"
          className="text-center font-sans text-lg font-semibold text-text"
        >
          {title}
        </Text>
        <DateTimePicker
          testID="time-picker"
          mode="time"
          display="spinner"
          locale="ko-KR"
          value={hmToDate(draft)}
          minuteInterval={minuteInterval}
          textColor={colors.text}
          onValueChange={(_, date) => setDraft(dateToHm(date))}
        />
        <Button title="완료" onPress={() => onDone(draft)} />
      </View>
    </Modal>
  );
}

interface Props {
  /** 요일('월') 또는 '시작' 같은 라벨 */
  label: string;
  /** 일요일은 빨간 라벨 */
  sunday?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  start: string;
  end: string;
  onChange: (range: { start: string; end: string }) => void;
  closedLabel?: string;
  minuteInterval?: PickerProps['minuteInterval'];
}

/** 영업시간 행(.timerow): 라벨 · 시작 ~ 종료 · 스위치. 끄면 시간 대신 '휴무' */
export function TimeRow({
  label,
  sunday = false,
  open,
  onOpenChange,
  start,
  end,
  onChange,
  closedLabel = '휴무',
  minuteInterval,
}: Props) {
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);
  const field = (which: 'start' | 'end') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${which === 'start' ? '시작' : '종료'} 시각`}
      accessibilityValue={{ text: which === 'start' ? start : end }}
      onPress={() => setEditing(which)}
      className="h-11 flex-1 items-center justify-center rounded-sm border border-border bg-surface px-2.5"
    >
      <Text className="font-sans text-md tracking-tight text-ink">
        {which === 'start' ? start : end}
      </Text>
    </Pressable>
  );
  return (
    <View className="flex-row items-center gap-2">
      <Text
        className={cn(
          'w-9 font-sans text-base font-semibold',
          sunday ? 'text-danger' : 'text-text2',
        )}
      >
        {label}
      </Text>
      {open ? (
        <>
          {field('start')}
          <Text className="w-3.5 text-center font-sans text-base text-muted">~</Text>
          {field('end')}
        </>
      ) : (
        <Text className="h-11 flex-1 pl-0.5 font-sans text-base leading-[44px] text-muted">
          {closedLabel}
        </Text>
      )}
      <View className="w-10 items-end">
        <Switch value={open} onValueChange={onOpenChange} accessibilityLabel={`${label} 영업`} />
      </View>
      {editing ? (
        <TimePickerModal
          title={`${label} ${editing === 'start' ? '시작' : '종료'} 시각`}
          value={editing === 'start' ? start : end}
          minuteInterval={minuteInterval}
          onDone={(hm) => {
            setEditing(null);
            if (hm) onChange({ start, end, [editing]: hm });
          }}
        />
      ) : null}
    </View>
  );
}
