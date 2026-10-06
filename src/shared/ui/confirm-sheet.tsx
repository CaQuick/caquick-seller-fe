import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { type ReactNode, type RefObject } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { AppBottomSheet } from './bottom-sheet';
import { Button } from './button';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  ref: RefObject<BottomSheetModal | null>;
  title: string;
  description?: string;
  /** 사유 선택(라디오). 없으면 생략 */
  options?: readonly Option<T>[];
  selected?: T | null;
  onSelect?: (value: T) => void;
  /** 옵션 아래 추가 입력(직접 입력 사유 등) */
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  /** 삭제·거절·로그아웃은 danger, 저장·이탈 확인은 primary */
  tone?: 'danger' | 'primary';
  confirmDisabled?: boolean;
  loading?: boolean;
}

/** 확인 시트(.sheet.confirm). 닫기는 시트를 내리고, 확정은 호출자가 처리 뒤 내린다 */
export function ConfirmSheet<T extends string>({
  ref,
  title,
  description,
  options,
  selected,
  onSelect,
  children,
  confirmLabel,
  onConfirm,
  cancelLabel = '닫기',
  tone = 'danger',
  confirmDisabled = false,
  loading = false,
}: Props<T>) {
  return (
    <AppBottomSheet ref={ref}>
      <Text
        accessibilityRole="header"
        className="my-2 text-center font-sans text-2xl font-bold tracking-tighter text-ink"
      >
        {title}
      </Text>
      {description ? (
        <Text className="mb-6 text-center font-sans text-base tracking-tight text-muted">
          {description}
        </Text>
      ) : null}
      {options || children ? (
        <View accessibilityRole="radiogroup" className="mb-5 gap-2">
          {options?.map((option) => {
            const on = option.value === selected;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: on }}
                onPress={() => onSelect?.(option.value)}
                className={cn(
                  'h-12 flex-row items-center gap-2.5 rounded-md border px-3.5',
                  on ? 'border-primary bg-tint2' : 'border-chip-border',
                )}
              >
                <View
                  className={cn(
                    'h-[18px] w-[18px] rounded-full',
                    on ? 'border-[5px] border-primary' : 'border-[1.5px] border-border',
                  )}
                />
                <Text
                  className={cn(
                    'font-sans text-md tracking-tight',
                    on ? 'text-primary' : 'text-text2',
                  )}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
          {children}
        </View>
      ) : null}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button title={cancelLabel} variant="secondary" onPress={() => ref.current?.dismiss()} />
        </View>
        <View className="flex-1">
          <Button
            title={confirmLabel}
            variant={tone}
            disabled={confirmDisabled}
            loading={loading}
            onPress={onConfirm}
          />
        </View>
      </View>
    </AppBottomSheet>
  );
}
