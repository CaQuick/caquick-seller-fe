import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { ApiError } from '@/shared/api';
import { ActionBar, MenuGroup, MenuRow, showToast, Stepper, TextField } from '@/shared/ui';

import { myStoreQueryOptions, updatePickupPolicy } from '../api/my-store';
import { storeKeys } from '../api/queryKeys';
import { SLOT_INTERVALS, stepSlotInterval } from '../model/calendar';
import { STORE_COPY, storeErrorMessage } from '../model/messages';
import { FieldLabel, InfoBox, QueryGate, SubScreen } from './parts';
import { PickupPreview } from './pickup-preview';

/** BE MIN/MAX_LEAD_TIME_MINUTES(0~7일)·MIN/MAX_DAYS_AHEAD(1~365) */
const LEAD_MAX = 7 * 24 * 60;
const DAYS_MAX = 365;

interface Policy {
  pickupSlotIntervalMinutes: number;
  minLeadTimeMinutes: number;
  maxDaysAhead: number;
}

function parseLead(text: string): number | null {
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n <= LEAD_MAX ? n : null;
}

function PolicyForm({
  storeId,
  isActive,
  saved,
}: {
  storeId: string;
  isActive: boolean;
  saved: Policy;
}) {
  const queryClient = useQueryClient();
  const [interval, setSlotInterval] = useState(saved.pickupSlotIntervalMinutes);
  const [lead, setLead] = useState(String(saved.minLeadTimeMinutes));
  const [days, setDays] = useState(saved.maxDaysAhead);
  const [formError, setFormError] = useState<string | null>(null);
  const leadValue = parseLead(lead);
  const changed =
    interval !== saved.pickupSlotIntervalMinutes ||
    leadValue !== saved.minLeadTimeMinutes ||
    days !== saved.maxDaysAhead;

  const save = useMutation({
    mutationFn: updatePickupPolicy,
    onSuccess: async (store) => {
      setFormError(null);
      queryClient.setQueryData(storeKeys.myStore(), store);
      showToast.success(STORE_COPY.saved);
      await queryClient.invalidateQueries({ queryKey: storeKeys.all });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.classification === 'BAD_USER_INPUT') {
        setFormError(storeErrorMessage(e));
      } else showToast.error(storeErrorMessage(e));
    },
  });

  return (
    <>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-[110px]">
          {formError ? (
            <InfoBox tone="danger" className="mt-5">
              {formError}
            </InfoBox>
          ) : null}
          <FieldLabel first={!formError}>픽업 시간</FieldLabel>
          <MenuGroup>
            <MenuRow
              title="슬롯 간격"
              description="픽업 시간을 고르는 단위 (분)"
              accessory={
                <Stepper
                  accessibilityLabel="슬롯 간격"
                  value={interval}
                  min={SLOT_INTERVALS[0]}
                  max={SLOT_INTERVALS[SLOT_INTERVALS.length - 1]}
                  onChange={(v) =>
                    setSlotInterval(stepSlotInterval(interval, v > interval ? 1 : -1))
                  }
                />
              }
            />
            <MenuRow
              title="최소 리드타임"
              description="픽업까지 최소 남아야 하는 시간"
              accessory={
                <View style={{ width: 112 }}>
                  <TextField
                    accessibilityLabel="최소 리드타임(분)"
                    keyboardType="number-pad"
                    alignRight
                    suffix="분"
                    value={lead}
                    onChangeText={setLead}
                  />
                </View>
              }
            />
            <MenuRow
              title="예약 가능 일수"
              description="오늘부터 며칠 뒤까지 받을지"
              accessory={
                <Stepper
                  accessibilityLabel="예약 가능 일수"
                  value={days}
                  min={1}
                  max={DAYS_MAX}
                  onChange={setDays}
                />
              }
            />
          </MenuGroup>
          {leadValue === null ? (
            <Text accessibilityLiveRegion="polite" className="mt-1.5 font-sans text-xs text-danger">
              {STORE_COPY.leadRange(LEAD_MAX)}
            </Text>
          ) : null}
          <PickupPreview storeId={storeId} isActive={isActive} policy={saved} />
        </ScrollView>
      </KeyboardAvoidingView>
      <ActionBar
        primary={{
          title: '저장',
          disabled: !changed || leadValue === null,
          loading: save.isPending,
          onPress: () =>
            save.mutate({
              pickupSlotIntervalMinutes: interval,
              minLeadTimeMinutes: leadValue ?? 0,
              maxDaysAhead: days,
            }),
        }}
      />
    </>
  );
}

/** 픽업 정책: 슬롯 간격·최소 리드타임·예약 가능 일수 + 구매자 달력 미리보기 */
export function StorePickupPolicyScreen() {
  const store = useQuery(myStoreQueryOptions());
  const s = store.data;
  return (
    <SubScreen title="픽업 정책" actionBar={!!s}>
      {s ? (
        <PolicyForm key={s.id} storeId={s.id} isActive={s.isActive} saved={s} />
      ) : (
        <QueryGate
          isPending={store.isPending}
          error={store.error}
          onRetry={() => void store.refetch()}
        />
      )}
    </SubScreen>
  );
}
