import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { type RefObject } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { messageFor } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import { AppBottomSheet, ErrorState, SkeletonRows } from '@/shared/ui';

import { paymentBanksQueryOptions } from '../api/settlement';

interface Props {
  ref: RefObject<BottomSheetModal | null>;
  selected: string | null;
  onPick: (bank: { code: string; name: string }) => void;
}

/** 은행 고르기. 목록 순서는 BE가 정한 표시 순서 */
export function BankSheet({ ref, selected, onPick }: Props) {
  const banks = useQuery(paymentBanksQueryOptions());
  return (
    <AppBottomSheet ref={ref} title="은행 선택">
      {banks.data ? (
        <ScrollView style={{ maxHeight: 420 }}>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {banks.data.map((bank) => {
              const on = bank.code === selected;
              return (
                <Pressable
                  key={bank.code}
                  accessibilityRole="radio"
                  accessibilityLabel={bank.name}
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    onPick(bank);
                    ref.current?.dismiss();
                  }}
                  className={cn(
                    'h-12 w-[31.5%] items-center justify-center rounded-sm border px-1',
                    on ? 'border-primary bg-tint2' : 'border-chip-border bg-surface',
                  )}
                >
                  <Text
                    numberOfLines={1}
                    className={cn(
                      'font-sans text-base tracking-tight',
                      on ? 'text-primary' : 'text-text2',
                    )}
                  >
                    {bank.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : banks.isError ? (
        <ErrorState description={messageFor(banks.error)} onRetry={() => void banks.refetch()} />
      ) : (
        <SkeletonRows count={3} />
      )}
    </AppBottomSheet>
  );
}
