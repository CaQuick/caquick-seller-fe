import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { type RefObject, useState } from 'react';
import { Text, View } from 'react-native';

import { formatKrw } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Chip, ConfirmSheet, TextField } from '@/shared/ui';

import {
  CANCEL_COPY,
  CANCEL_FAULTS,
  type CancelForm,
  type CancelInput,
  type CancelMode,
  EMPTY_CANCEL_FORM,
  refundNotice,
  SELLER_CANCEL_REASONS,
  toCancelInput,
} from '../model/cancel-form';

const NOTE_MAX = 500;

const Label = ({ children }: { children: string }) => (
  <Text className="mt-1 font-sans text-sm tracking-tight text-sublabel">{children}</Text>
);

interface Props {
  ref: RefObject<BottomSheetModal | null>;
  mode: CancelMode;
  /** 확인된 결제 금액(환불 상한). 결제 기록이 없으면 0 */
  total: number;
  loading: boolean;
  onSubmit: (input: CancelInput) => void;
}

/** 거절(접수: 사유·메모, 전액 환불)과 취소(확정·제작 완료: 사유·사정·구매자 사정이면 환불 금액·메모) */
export function CancelOrderSheet({ ref, mode, total, loading, onSubmit }: Props) {
  const [form, setForm] = useState<CancelForm>(EMPTY_CANCEL_FORM);
  const set = (patch: Partial<CancelForm>) => setForm((f) => ({ ...f, ...patch }));
  const input = toCancelInput(mode, form, total);
  const notice = refundNotice(mode, form, total);
  const copy = CANCEL_COPY[mode];
  return (
    <ConfirmSheet
      ref={ref}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirm}
      confirmDisabled={!input}
      loading={loading}
      onConfirm={() => input && onSubmit(input)}
    >
      <Label>사유</Label>
      <View className="flex-row flex-wrap gap-2">
        {SELLER_CANCEL_REASONS.map((r) => (
          <Chip
            key={r.value}
            label={r.label}
            selected={form.reason === r.value}
            onPress={() => set({ reason: r.value })}
          />
        ))}
      </View>
      {mode === 'cancel' ? (
        <>
          <Label>사정</Label>
          <View className="flex-row gap-2">
            {CANCEL_FAULTS.map((f) => (
              <Chip
                key={f.value}
                label={f.label}
                selected={form.fault === f.value}
                onPress={() => set({ fault: f.value })}
                className="flex-1"
              />
            ))}
          </View>
          {form.fault === 'BUYER' ? (
            <TextField
              sublabel={`돌려줄 금액 (0~${formatKrw(total)})`}
              accessibilityLabel="환불 금액"
              keyboardType="number-pad"
              suffix="원"
              alignRight
              value={form.refundAmount}
              onChangeText={(refundAmount) => set({ refundAmount })}
              className="mt-1"
            />
          ) : null}
        </>
      ) : null}
      <TextField
        sublabel="메모 (선택)"
        accessibilityLabel={`${mode === 'reject' ? '거절' : '취소'} 메모`}
        placeholder="구매자에게 전달할 내용을 적어 주세요"
        multiline
        maxLength={NOTE_MAX}
        value={form.note}
        onChangeText={(note) => set({ note })}
        className="mt-1"
      />
      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          className={cn(
            'font-sans text-sm tracking-tight',
            notice.error ? 'text-danger' : 'text-text3',
          )}
        >
          {notice.text}
        </Text>
      ) : null}
    </ConfirmSheet>
  );
}
